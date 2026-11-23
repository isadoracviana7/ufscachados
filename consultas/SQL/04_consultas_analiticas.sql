SELECT 
    b.nome AS bloco_predio,
    COUNT(o.id_objeto) AS total_objetos
FROM OBJETO o
JOIN LOCAL_ESPECIFICO l ON o.id_local = l.id_local
JOIN BLOCO_PREDIO b ON l.id_bloco = b.id_bloco
GROUP BY b.nome
ORDER BY total_objetos DESC;


SELECT 
    c.nome AS categoria,
    s.descricao AS status_objeto,
    COUNT(o.id_objeto) AS quantidade_itens
FROM OBJETO o
JOIN CATEGORIA c ON o.id_categoria = c.id_categoria
JOIN STATUS s ON o.id_status = s.id_status
GROUP BY c.nome, s.descricao
ORDER BY c.nome ASC, quantidade_itens DESC;


SELECT 
    r.status AS status_reivindicacao,
    c.nome AS categoria_objeto,
    COUNT(r.id_reivindicacao) AS total_solicitacoes
FROM REIVINDICACAO r
JOIN OBJETO o ON r.id_objeto = o.id_objeto
JOIN CATEGORIA c ON o.id_categoria = c.id_categoria
JOIN USUARIO u ON r.id_usuario = u.id_usuario
GROUP BY r.status, c.nome
ORDER BY total_solicitacoes DESC;