# contex
- [x] Configurar servidor com hono
- [x] Configurar bun no projeto
- [x] Configurar setup de test - vamos utilizar jest
- [x] Configurar typescript
- [x] Configurar docker compose para ambiente local contento uma instacia do cassandra e outra do redis
- [x] Configurar variaveis de ambiente - PORT, ENV, SALT_SECRET, DATABASE_URL, REDIS_URL

# estrutura 
-src
 |_ domain/
    |_ usecase/
    |_ services/
    |_ repository/
  |_ application/
    |_ controller/
    |_ services/
    |_ repository
      |_ models/
    |_ shared/
  |_ tests/

  # decision
  cassandra - alta disponibilidade e utilizaçao de nós e facilidade para otimizar esse cenario
  o shortcode de cada url encurtada ira conter 4 caracteres podendo aumentar 
  utilizar base62 com salt para sortear a possicao 
  Utilizar o redis para gerar o shortcode_number com increment
  Utilizar o redis para cachear as urls mais utilizadas
