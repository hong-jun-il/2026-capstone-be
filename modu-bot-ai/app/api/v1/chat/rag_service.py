from google import genai
from app.constants.config import settings


class RAGService:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.answer_model = settings.GEMINI_ANSWER_MODEL
        self.embedding_model = settings.GEMINI_EMBEDDING_MODEL

    def get_embedding(self, text_or_list: str | list[str]):
        input_data = [text_or_list] if isinstance(text_or_list, str) else text_or_list

        result = self.client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=input_data,
            config={"output_dimensionality": 768},
        )

        embeddings = [embedding.values for embedding in result.embeddings]

        return embeddings[0] if isinstance(text_or_list, str) else embeddings


rag_service = RAGService()
