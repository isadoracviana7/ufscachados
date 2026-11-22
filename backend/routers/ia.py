import os                                      # Usada para interagir com o sistema operacional (ler o arquivo .env)
import json                                    # Converte dados para JSON
import time                                    # Pausa entre tentativas (backoff)
from typing import List                        # Define a tipagem estática de listas nas rotas do FastAPI
from fastapi import APIRouter, Depends, HTTPException  # Módulos principais do FastAPI para criar rotas, injetar dependências e tratar erros HTTP
from sqlalchemy.orm import Session             # Classe para gerenciar sessões e consultas no banco de dados ORM
from google import genai                       # Biblioteca e SDK oficial do Google GenAI para interagir com os modelos Gemini
from google.genai import types                 # Tipos e configurações auxiliares oficiais da API do Google GenAI

from database import get_db                    
import models                                 
import schemas                                 

router = APIRouter()

# Modelos tentados em ordem: se o principal estiver sobrecarregado (503), cai para o próximo.
# Pode ser sobrescrito no .env: GEMINI_MODELS=modelo1,modelo2,modelo3
MODELOS_PADRAO = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"]
TENTATIVAS_POR_MODELO = 3       # Quantas vezes repetir o mesmo modelo antes de trocar
ERROS_TEMPORARIOS = ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "500", "INTERNAL", "504", "DEADLINE")


def _chamar_gemini_com_fallback(client, prompt):
    """Tenta cada modelo com retry e backoff exponencial em erros temporários. Levanta o último erro se tudo falhar."""
    modelos = [m.strip() for m in os.getenv("GEMINI_MODELS", ",".join(MODELOS_PADRAO)).split(",") if m.strip()]
    ultimo_erro = None
    for modelo in modelos:
        for tentativa in range(TENTATIVAS_POR_MODELO):
            try:
                return client.models.generate_content(
                    model=modelo,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",      # Força a resposta em formato JSON puro
                        temperature=0.2,                            # Baixa temperatura para respostas mais objetivas e consistentes
                    ),
                )
            except Exception as e:
                ultimo_erro = e
                if not any(c in str(e) for c in ERROS_TEMPORARIOS):
                    # Erro não temporário (ex.: 404 modelo inexistente, 400, 403 chave inválida): tenta o próximo modelo
                    break
                time.sleep(2 ** tentativa)      # 1s, 2s, 4s
    raise ultimo_erro


@router.post(
    "/ia/buscar-objeto",
    response_model=List[schemas.ResultadoBuscaIA],
    tags=["Busca Inteligente (IA)"],
    summary="Busca semântica de objetos perdidos com Gemini",
    description="Recebe uma descrição livre em linguagem natural do usuário, consulta os itens disponíveis no PostgreSQL e usa o modelo Gemini (LLM) para ranquear os objetos mais compatíveis com justificativa."
)
def buscar_objeto_com_ia(consulta: schemas.BuscaIAPrompt, db: Session = Depends(get_db)):
    api_key = os.getenv("GEMINI_API_KEY")       # Valida se a chave de API do Gemini foi configurada no arquivo .env
    if not api_key:
        raise HTTPException(status_code=500, detail="Chave GEMINI_API_KEY não configurada no arquivo .env.")

    # Busca no banco os objetos com JOIN em Categoria, Cor, Local e Bloco (exclui já devolvidos)
    itens = (
        db.query(
            models.Objeto.id_objeto,
            models.Objeto.descricao_publica,
            models.Objeto.data_registro,
            models.Categoria.nome.label("categoria"),
            models.Cor.nome.label("cor"),
            models.LocalEspecifico.nome.label("local"),
            models.BlocoPredio.nome.label("bloco"),
        )
        # Junta Objeto as tabelas Cateogria, Cor, Localespecifico | Localespecifico a BlocoPredio
        .join(models.Categoria, models.Objeto.id_categoria == models.Categoria.id_categoria)
        .join(models.Cor, models.Objeto.id_cor == models.Cor.id_cor)
        .join(models.LocalEspecifico, models.Objeto.id_local == models.LocalEspecifico.id_local)
        .join(models.BlocoPredio, models.LocalEspecifico.id_bloco == models.BlocoPredio.id_bloco)
        .filter(models.Objeto.id_status != 3)  # Ignora itens já devolvidos
        .all()
    )

    if not itens:
        return []

    # Monta o catálogo público em JSON (sem expor detalhe_seguranca_oculto ao prompt)
    catalogo = [
        {
            "id_objeto": i.id_objeto,
            "descricao_publica": i.descricao_publica,
            "categoria": i.categoria,
            "cor": i.cor,
            "local": f"{i.local} ({i.bloco})",
            "data_registro": str(i.data_registro),
        }
        for i in itens
    ]

    prompt = f"""
    Você é o assistente inteligente do sistema de Achados e Perdidos da UFSC Araranguá (UFSCAchados).
    Um usuário descreveu o item que perdeu: "{consulta.descricao_usuario}"

    Analise o catálogo de objetos encontrados abaixo e retorne APENAS os itens que tenham compatibilidade semântica real com o relato do usuário (mesmo que ele use sinônimos ou descrições aproximadas).
    Catálogo:
    {json.dumps(catalogo, ensure_ascii=False)}

    Responda exclusivamente com uma lista JSON seguindo exatamente esta estrutura para cada item compatível:
    [
      {{
        "id_objeto": 1,
        "descricao_publica": "texto exato do catálogo",
        "grau_compatibilidade": "Alta" | "Média" | "Baixa",
        "justificativa": "explicação breve do porquê este item combina com o relato"
      }}
    ]
    Se nenhum item for compatível, retorne [].
    """

    # Instancia o cliente oficial do Gemini e envia a requisição (com retry e fallback de modelos)
    try:
        client = genai.Client(api_key=api_key)
        response = _chamar_gemini_com_fallback(client, prompt)

        # Converte o texto de resposta da IA em um objeto/lista Python válida e a retorna
        resultados = json.loads(response.text)
        return resultados
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="A IA retornou uma resposta fora do formato JSON esperado. Tente novamente.")
    except Exception as e:
        # 503 = serviço do Gemini indisponível (não é erro da sua aplicação)
        raise HTTPException(status_code=503, detail=f"A API do Gemini está indisponível no momento. Tente novamente em instantes. Detalhe: {str(e)}")
