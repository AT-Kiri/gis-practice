"""
应用配置管理
从 .env 文件读取配置，不硬编码任何密钥

注意：通过 settings_customise_sources 让 .env 文件优先于进程环境变量，
避免 IDE/系统残留的同名环境变量（如旧的 DEEPSEEK_API_KEY）覆盖 .env 配置。
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # DeepSeek LLM 配置
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"

    # iServer 配置
    iserver_url: str = "http://localhost:8090"

    # 后端服务配置
    host: str = "0.0.0.0"
    port: int = 8001

    # RAG / Embedding 配置
    embedding_api_key: str = ""
    embedding_base_url: str = "https://api.deepseek.com/v1"
    embedding_model: str = "text-embedding-3-small"

    # 向量库存储路径
    vector_store_path: str = "vector_store"

    # 知识库文档目录
    knowledge_dir: str = "data/knowledge"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        # 优先级：构造参数 > .env 文件 > 进程环境变量 > 密钥文件
        # 这样 .env 中的配置会覆盖终端继承来的同名环境变量
        return (init_settings, dotenv_settings, env_settings, file_secret_settings)


settings = Settings()
