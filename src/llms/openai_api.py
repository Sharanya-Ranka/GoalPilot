# infrastructure/llm_client.py
from abc import ABC, abstractmethod
import os
import openai

class LLMProvider(ABC):
    """Abstract Base Class for LLM providers."""
    @abstractmethod
    def call(self, messages: list) -> str:
        pass

class OpenAIProvider(LLMProvider):
    """Concrete implementation for OpenAI GPT-4.1 series."""
    def __init__(self, model="gpt-4.1-mini", api_key=None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = openai.OpenAI(api_key=self.api_key)
        self.model = model

    def call(self, messages: list) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error calling OpenAI: {str(e)}"