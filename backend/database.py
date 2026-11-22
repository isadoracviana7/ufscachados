# ARQUIVO QUE FAZ A PONTE ENTRE A APPLICACAO PYTHON(FASTAPI) E O BD DO POSTGRESSQL
import os                                   # Lê variáveis de ambiente do sistema operacional
from sqlalchemy import create_engine        # Cria o motor físico de conexão com o banco de dados
from sqlalchemy.orm import sessionmaker, declarative_base       # sessionmaker fabrica sessões; declarative_base cria a classe base dos models
from dotenv import load_dotenv              # Carrega as variáveis do arquivo .env para a memória

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")    # Carrega o DATABASE_URL do arquivo .env

# Garante que a aplicação falhe imediatamente com mensagem clara se o .env não estiver configurado  
if not DATABASE_URL:
    raise ValueError("Erro: A variável DATABASE_URL não foi encontrada no arquivo .env.")

# pool_pre_ping=True verifica se a conexão ainda está ativa antes de usar quando migrarmos para nuvem
engine = create_engine(DATABASE_URL, pool_pre_ping=True)        # Cria o motor físico de conexão do SQLAlchemy com o PostgreSQL (gerenciando o pool de conexões por baixo dos panos).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)     # Cria uma "fábrica" de sessões que devem ser explicitamente commitadas e o autoflush em false evita que o SQLAlchemy envie alterações pendentes para o banco antes da hora durante consultas intermediárias
Base = declarative_base()                   # Cria a classe mae que eh importada no models.py registrando todas asd tabelas

def get_db():       # Quando uma rota da API é acessada essa funcao contra o ciclo de vida completo da conexacao com o BD
    db = SessionLocal()
    try:
        yield db        # Entrega o objeto db para a rota da API e pausa a execucao do get_db()   
    except Exception:
        db.rollback()   # Desfaz alterações pendentes caso ocorra erro durante a requisição
        raise           # Retorna o erro para o FastAPI
    finally:
        db.close()      #  garante que a conexão seja fechada mesmo se ocorrer algum erro no meio do caminho evitando o travamento do banco por excesso de conexões abertas.