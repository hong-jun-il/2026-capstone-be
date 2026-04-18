from google import genai
from app.constants.config import settings
from app.constants.prompt import RAG_ANSWER_PROMPT_TEMPLATE
from app.schemas.info_data import RefinedInfo
from datetime import datetime


class RAGService:
    def __init__(self, vector_db):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.answer_model = settings.GEMINI_ANSWER_MODEL
        self.refine_model = settings.GEMINI_REFINE_MODEL
        self.embedding_model = settings.GEMINI_EMBEDDING_MODEL
        self.vector_db = vector_db

    # 임베딩
    def get_embedding(self, text_or_list: str | list[str]):
        input_data = [text_or_list] if isinstance(text_or_list, str) else text_or_list

        result = self.client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=input_data,
            config={"output_dimensionality": 768},
        )

        embeddings = [embedding.values for embedding in result.embeddings]

        return embeddings[0] if isinstance(text_or_list, str) else embeddings

    # 답변 생성
    def generate_answer(self, question: str):

        query_vector = self.get_embedding(question)

        search_results = self.vector_db.search_similar(query_vector, limit=3)

        context_text = "\n".join(
            [res.payload.get("content", "") for res in search_results]
        )

        prompt = RAG_ANSWER_PROMPT_TEMPLATE.format(
            context=context_text, question=question
        )

        response = self.client.models.generate_content(
            model=self.answer_model, contents=prompt
        )

        return response.text

    async def refine_raw_text(self, category: str, source: str, content: str) -> dict:
        prompt = f"""
        사용자가 입력한 대학 관련 정보를 바탕으로 RAG 시스템에 저장할 정제된 데이터를 생성해줘.
        
        [입력 데이터]
        - 카테고리: {category}
        - 정보 출처: {source}
        - 내용: {content}
        
        [지침]
        1. 내용(content)을 바탕으로 공지사항 형식의 명확한 제목(title)을 작성할 것.
        2. 내용(content)의 맞춤법을 교정하고, '~함', '~임' 등의 말투를 '~합니다' 또는 문어체로 바꿀 것.
        3. 카테고리와 출처는 입력받은 값을 기본으로 하되, 내용과 어울리지 않으면 적절히 수정할 것.
        4. 반드시 한국어로 작성할 것.
        """

        response = self.client.models.generate_content(
            model=self.refine_model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": RefinedInfo,
            },
        )

        # JSON 문자열을 딕셔너리로 변환하여 반환
        import json

        return json.loads(response.text)

    async def update_info_logic(
        self,
        info_id: str,
        wallet_address: str,
        category: str,
        source: str,
        content: str,
    ):
        existing_points = self.vector_db.client.retrieve(
            collection_name=self.vector_db.collection_name, ids=[info_id]
        )

        if not existing_points:
            return None, "해당 정보를 찾을 수 없습니다."

        existing_payload = existing_points[0].payload

        refined_data = await self.refine_raw_text(
            category=category, source=source, content=content
        )

        new_vector = self.get_embedding(
            f"{refined_data['title']}\n{refined_data['content']}"
        )

        now = datetime.now().isoformat()
        updated_payload = {
            **existing_payload,
            "category": refined_data["category"],
            "title": refined_data["title"],
            "content": refined_data["content"],
            "source": refined_data["source"],
            "updated_at": now,
            "updated_by": wallet_address,
        }

        from app.schemas.vector import VectorPoint

        point = VectorPoint(id=info_id, vector=new_vector, payload=updated_payload)
        self.vector_db.upsert_data(point)

        return updated_payload, None
