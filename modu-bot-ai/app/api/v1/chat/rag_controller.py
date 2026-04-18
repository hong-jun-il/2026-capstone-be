from fastapi import APIRouter, Query, Depends
from typing import Optional
from app.schemas.common import ResponseType
from app.schemas.vector import VectorPoint
from app.api.v1.chat.rag_service import RAGService
from app.db.vectorDB import VectorDB
from app.core.dependencies import get_rag_service, get_vector_db
from pydantic import BaseModel, Field
import uuid
from datetime import datetime

router = APIRouter()


class ChatRequest(BaseModel):
    question: str


@router.post("/ask", response_model=ResponseType)
async def ask_question(
    request: ChatRequest, rag_service: RAGService = Depends(get_rag_service)
):
    answer = rag_service.generate_answer(request.question)

    return ResponseType(success=True, data=answer)


@router.get("/get_category_infos", response_model=ResponseType)
async def get_category_infos(
    category: str = Query(..., description="조회할 카테고리"),
    limit: int = Query(50, description="한 페이지당 가져올 개수"),
    offset: Optional[str] = Query(
        None, description="마지막으로 읽은 데이터의 ID(커서)"
    ),
    vector_db: VectorDB = Depends(get_vector_db),
):
    result = vector_db.get_category_infos_scroll(
        category_name=category, limit=limit, offset=offset
    )

    return ResponseType(success=True, data=result)


class InfoCreateRequest(BaseModel):
    wallet_address: str = Field(..., description="유저의 지갑 주소")
    category: str
    source: str
    content: str


@router.post("/create_category_info", response_model=ResponseType)
async def create_category_info(
    request: InfoCreateRequest, rag_service: RAGService = Depends(get_rag_service)
):
    refined_data = await rag_service.refine_raw_text(
        category=request.category, source=request.source, content=request.content
    )

    now = datetime.now()
    info_id = str(uuid.uuid4())

    payload = {
        "id": info_id,
        "category": refined_data["category"],
        "title": refined_data["title"],
        "content": refined_data["content"],
        "source": refined_data["source"],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": request.wallet_address,
        "updated_by": request.wallet_address,
        "approved_by": "admin",
    }

    vector = rag_service.get_embedding(f"{payload['title']}\n{payload['content']}")

    point = VectorPoint(id=info_id, vector=vector, payload=payload)

    rag_service.vector_db.upsert_data(point)

    return ResponseType(success=True, data={"message": "정보 생성 완료", "id": info_id})


@router.put("/update_category_info/{info_id}", response_model=ResponseType)
async def update_category_info(
    info_id: str,
    request: InfoCreateRequest,
    rag_service: RAGService = Depends(get_rag_service),
):
    _, error_msg = await rag_service.update_info_logic(
        info_id=info_id,
        wallet_address=request.wallet_address,
        category=request.category,
        source=request.source,
        content=request.content,
    )

    if error_msg:
        return ResponseType(
            success=False, error={"code": "NOT_FOUND", "message": error_msg}
        )

    return ResponseType(success=True, data={"message": "정보 수정 완료", "id": info_id})
