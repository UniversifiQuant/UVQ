from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import asyncio
import aiohttp
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="UVQ - UniversifiQuant Oracle Agent")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class BitcoinData(BaseModel):
    price: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    volume_24h: Optional[float] = None
    price_change_24h: Optional[float] = None
    volatility: Optional[float] = None
    network_fees: Optional[Dict] = None

class PaymentScenario(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scenario_type: str  # retirement, health, university, daily_bills
    amount_usd: float
    target_date: Optional[datetime] = None
    risk_tolerance: str = "medium"  # low, medium, high
    inflation_rate: float = 0.07  # 7% default
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class PaymentRecommendation(BaseModel):
    scenario_id: str
    recommended_btc_amount: float
    optimal_timing: str
    confidence_score: float
    reasoning: str
    volatility_forecast: float
    projected_savings: Optional[float] = None
    risk_assessment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIAnalysisRequest(BaseModel):
    query: str
    market_context: Optional[Dict] = None
    scenario_type: Optional[str] = None

class AIAnalysisResponse(BaseModel):
    analysis: str
    recommendations: List[str]
    confidence: float
    market_sentiment: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Bitcoin Data Collection Service
class BitcoinDataCollector:
    def __init__(self):
        self.coingecko_url = "https://api.coingecko.com/api/v3"
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def get_bitcoin_data(self) -> BitcoinData:
        """Get current Bitcoin data from CoinGecko"""
        try:
            url = f"{self.coingecko_url}/simple/price"
            params = {
                'ids': 'bitcoin',
                'vs_currencies': 'usd',
                'include_24hr_vol': 'true',
                'include_24hr_change': 'true',
                'include_market_cap': 'true'
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    btc_data = data['bitcoin']
                    
                    # Calculate simple volatility (price change percentage)
                    volatility = abs(btc_data.get('usd_24h_change', 0)) / 100
                    
                    return BitcoinData(
                        price=btc_data['usd'],
                        volume_24h=btc_data.get('usd_24h_vol'),
                        price_change_24h=btc_data.get('usd_24h_change'),
                        volatility=volatility,
                        network_fees=await self.get_network_fees()
                    )
                else:
                    raise HTTPException(status_code=503, detail="Unable to fetch Bitcoin data")
        except Exception as e:
            logger.error(f"Error fetching Bitcoin data: {str(e)}")
            raise HTTPException(status_code=500, detail="Bitcoin data service unavailable")
    
    async def get_network_fees(self) -> Dict:
        """Get Bitcoin network fee estimates"""
        try:
            # Using a simple estimation since we're starting with free APIs
            return {
                "fast": 25,  # sat/vB
                "medium": 15,
                "slow": 8,
                "estimated_at": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error fetching network fees: {str(e)}")
            return {"fast": 20, "medium": 12, "slow": 6}

# AI Analysis Service
class BitcoinAIAnalyzer:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not self.api_key:
            logger.warning("EMERGENT_LLM_KEY not found. AI analysis will be limited.")
    
    async def analyze_payment_timing(self, scenario: PaymentScenario, current_data: BitcoinData) -> PaymentRecommendation:
        """Analyze optimal payment timing using AI"""
        if not self.api_key:
            return self._create_fallback_recommendation(scenario, current_data)
        
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"payment_analysis_{scenario.id}",
                system_message="You are an expert Bitcoin analyst specializing in payment timing optimization and inflation hedging strategies."
            ).with_model("openai", "gpt-4o-mini")
            
            analysis_prompt = f"""
            Analyze the optimal Bitcoin payment timing for this scenario:
            
            Scenario: {scenario.scenario_type}
            Amount: ${scenario.amount_usd:,.2f}
            Target Date: {scenario.target_date or 'Flexible'}
            Risk Tolerance: {scenario.risk_tolerance}
            Inflation Rate: {scenario.inflation_rate:.1%}
            
            Current Bitcoin Market:
            Price: ${current_data.price:,.2f}
            24h Change: {current_data.price_change_24h:.2f}%
            Volatility: {current_data.volatility:.2%}
            Volume: ${current_data.volume_24h:,.0f} if current_data.volume_24h else 'N/A'
            
            Provide analysis in this JSON format:
            {{
                "recommended_btc_amount": float,
                "optimal_timing": "immediate|wait_1_day|wait_1_week|flexible",
                "confidence_score": float (0-1),
                "reasoning": "detailed explanation",
                "volatility_forecast": float (0-1),
                "projected_savings": float or null,
                "risk_assessment": "low|medium|high"
            }}
            
            Consider:
            1. Current market volatility and trend
            2. Dollar-cost averaging vs lump sum for this scenario
            3. Inflation hedging effectiveness
            4. Risk tolerance alignment
            5. Time horizon for the specific scenario type
            """
            
            user_message = UserMessage(text=analysis_prompt)
            response = await chat.send_message(user_message)
            
            # Parse AI response
            try:
                analysis_data = json.loads(response)
                return PaymentRecommendation(
                    scenario_id=scenario.id,
                    **analysis_data
                )
            except json.JSONDecodeError:
                logger.error("Failed to parse AI response as JSON")
                return self._create_fallback_recommendation(scenario, current_data)
                
        except Exception as e:
            logger.error(f"AI analysis error: {str(e)}")
            return self._create_fallback_recommendation(scenario, current_data)
    
    def _create_fallback_recommendation(self, scenario: PaymentScenario, current_data: BitcoinData) -> PaymentRecommendation:
        """Create fallback recommendation when AI is unavailable"""
        btc_amount = scenario.amount_usd / current_data.price
        
        # Simple rule-based timing
        if current_data.volatility > 0.05:  # High volatility
            timing = "wait_1_day"
            confidence = 0.6
        elif current_data.price_change_24h < -3:  # Price dropped significantly
            timing = "immediate"
            confidence = 0.7
        else:
            timing = "flexible"
            confidence = 0.5
        
        return PaymentRecommendation(
            scenario_id=scenario.id,
            recommended_btc_amount=btc_amount,
            optimal_timing=timing,
            confidence_score=confidence,
            reasoning=f"Basic analysis based on current volatility ({current_data.volatility:.2%}) and price trend.",
            volatility_forecast=current_data.volatility,
            risk_assessment=scenario.risk_tolerance
        )
    
    async def get_market_analysis(self, query: str, context: Dict = None) -> AIAnalysisResponse:
        """Get AI-powered market analysis"""
        if not self.api_key:
            return AIAnalysisResponse(
                analysis="AI analysis temporarily unavailable. Please check back later.",
                recommendations=["Monitor market conditions", "Consider dollar-cost averaging"],
                confidence=0.3,
                market_sentiment="neutral"
            )
        
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"market_analysis_{datetime.now().timestamp()}",
                system_message="You are a Bitcoin market expert providing analysis for payment timing and inflation hedging."
            ).with_model("openai", "gpt-4o-mini")
            
            context_str = json.dumps(context) if context else "No additional context provided"
            
            analysis_prompt = f"""
            Provide Bitcoin market analysis for: {query}
            
            Context: {context_str}
            
            Respond in JSON format:
            {{
                "analysis": "detailed market analysis",
                "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
                "confidence": float (0-1),
                "market_sentiment": "bullish|bearish|neutral"
            }}
            
            Focus on:
            1. Current market conditions
            2. Payment timing optimization
            3. Inflation hedging considerations
            4. Risk factors
            """
            
            user_message = UserMessage(text=analysis_prompt)
            response = await chat.send_message(user_message)
            
            try:
                analysis_data = json.loads(response)
                return AIAnalysisResponse(**analysis_data)
            except json.JSONDecodeError:
                return AIAnalysisResponse(
                    analysis=response,
                    recommendations=["Monitor market trends", "Consider gradual accumulation"],
                    confidence=0.7,
                    market_sentiment="neutral"
                )
                
        except Exception as e:
            logger.error(f"Market analysis error: {str(e)}")
            return AIAnalysisResponse(
                analysis="Unable to generate analysis at this time.",
                recommendations=["Try again later", "Monitor market conditions"],
                confidence=0.2,
                market_sentiment="neutral"
            )

# Initialize services
data_collector = BitcoinDataCollector()
ai_analyzer = BitcoinAIAnalyzer()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "UVQ - UniversifiQuant Oracle Agent", "status": "active"}

@api_router.get("/bitcoin/current", response_model=BitcoinData)
async def get_current_bitcoin_data():
    """Get current Bitcoin market data"""
    collector = BitcoinDataCollector()
    async with collector:
        return await collector.get_bitcoin_data()

@api_router.post("/scenarios", response_model=PaymentScenario)
async def create_payment_scenario(scenario: PaymentScenario):
    """Create a new payment scenario"""
    scenario_dict = scenario.dict()
    await db.payment_scenarios.insert_one(scenario_dict)
    return scenario

@api_router.get("/scenarios", response_model=List[PaymentScenario])
async def get_payment_scenarios():
    """Get all payment scenarios"""
    scenarios = await db.payment_scenarios.find().to_list(100)
    return [PaymentScenario(**scenario) for scenario in scenarios]

@api_router.post("/analyze/{scenario_id}", response_model=PaymentRecommendation)
async def analyze_scenario(scenario_id: str):
    """Analyze a payment scenario and get recommendations"""
    # Get scenario from database
    scenario_doc = await db.payment_scenarios.find_one({"id": scenario_id})
    if not scenario_doc:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    scenario = PaymentScenario(**scenario_doc)
    
    # Get current Bitcoin data
    async with BitcoinDataCollector() as collector:
        current_data = await collector.get_bitcoin_data()
    
    # Generate AI-powered recommendation
    recommendation = await ai_analyzer.analyze_payment_timing(scenario, current_data)
    
    # Store recommendation
    recommendation_dict = recommendation.dict()
    await db.payment_recommendations.insert_one(recommendation_dict)
    
    return recommendation

@api_router.get("/recommendations/{scenario_id}", response_model=List[PaymentRecommendation])
async def get_scenario_recommendations(scenario_id: str):
    """Get all recommendations for a scenario"""
    recommendations = await db.payment_recommendations.find({"scenario_id": scenario_id}).to_list(50)
    return [PaymentRecommendation(**rec) for rec in recommendations]

@api_router.post("/analysis/market", response_model=AIAnalysisResponse)
async def get_market_analysis(request: AIAnalysisRequest):
    """Get AI-powered market analysis"""
    return await ai_analyzer.get_market_analysis(request.query, request.market_context)

@api_router.get("/dashboard/summary")
async def get_dashboard_summary():
    """Get summary data for dashboard"""
    async with BitcoinDataCollector() as collector:
        bitcoin_data = await collector.get_bitcoin_data()
    
    # Get scenario counts
    total_scenarios = await db.payment_scenarios.count_documents({})
    recent_recommendations = await db.payment_recommendations.find().sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "bitcoin_data": bitcoin_data.dict(),
        "total_scenarios": total_scenarios,
        "recent_recommendations": len(recent_recommendations),
        "market_status": "active",
        "timestamp": datetime.now(timezone.utc)
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
