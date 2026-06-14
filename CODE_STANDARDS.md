# Padrões de Código

Este documento define os padrões de qualidade esperados para o código deste projeto.
Não é sobre escrever menos linhas. Código sênior muitas vezes é maior, porém muito mais
fácil de entender, manter e evoluir.

Pilares:
- Legibilidade
- Manutenibilidade
- Separação de responsabilidades
- Tratamento de erros
- Extensibilidade
- Observabilidade
- Testabilidade

---

## 1. Nomeação

### Ruim
```ts
function calc(a, b, c) {
  return a * b * (1 - c);
}
```
Problemas: nomes genéricos, intenção não fica clara, difícil manutenção.

### Melhor
```ts
function calculateDiscountedPrice(
  unitPrice: number,
  quantity: number,
  discountPercentage: number,
): number {
  return unitPrice * quantity * (1 - discountPercentage);
}
```
Benefícios: autoexplicativo, reduz necessidade de comentários, facilita onboarding.

---

## 2. Regra de negócio misturada com infraestrutura

### Ruim
```ts
async function createUser(data) {
  const user = await db.insert(data);
  await emailService.send({ to: user.email, subject: 'Welcome' });
  return user;
}
```
Problemas: forte acoplamento, difícil testar, difícil trocar provedor.

### Melhor
```ts
class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CreateUserInput) {
    const user = await this.userRepository.create(input);
    await this.eventBus.publish(new UserCreatedEvent(user.id));
    return user;
  }
}
```
Benefícios: regra de negócio isolada, mais testável, mais extensível.

Aplicação no projeto: usecases em `domain/usecase` não devem importar diretamente
clientes de infraestrutura (cassandra, redis, axios etc). Dependem de interfaces
definidas em `domain/repository` e `domain/services`, implementadas em `application/`.

---

## 3. Condicionais gigantes

### Ruim
```ts
if (status === 'PENDING') { ... }
else if (status === 'APPROVED') { ... }
else if (status === 'REJECTED') { ... }
else if (status === 'CANCELLED') { ... }
```
Problemas: cresce mal, alta chance de erro, difícil manutenção.

### Melhor
```ts
const handlers = {
  PENDING: handlePending,
  APPROVED: handleApproved,
  REJECTED: handleRejected,
  CANCELLED: handleCancelled,
};

await handlers[status]?.();
```
Benefícios: mais extensível, mais legível, facilita Strategy Pattern.

---

## 4. Tratamento de erros

### Ruim
```ts
try {
  await processPayment();
} catch (e) {
  console.log(e);
}
```
Problemas: perde contexto, sem observabilidade, dificulta troubleshooting.

### Melhor
```ts
try {
  await processPayment();
} catch (error) {
  logger.error(
    { error, paymentId, customerId },
    'Payment processing failed',
  );
  throw error;
}
```
Benefícios: logs estruturados, melhor rastreabilidade, compatível com observabilidade.

Aplicação no projeto: usecases lançam erros de domínio tipados (ex: `UrlExpiredError`,
`ShortcodeNotFoundError`, `AliasAlreadyExistsError`). Controllers traduzem esses erros
para status HTTP apropriados em um único lugar (error handler central do Hono),
nunca com `try/catch` espalhado em cada rota.

---

## 5. Magic numbers / valores mágicos

### Ruim
```ts
if (user.age >= 18) { ... }
```
Problemas: valor sem contexto, regras escondidas.

### Melhor
```ts
const LEGAL_AGE = 18;
if (user.age >= LEGAL_AGE) { ... }
```
Benefícios: regra explícita, fácil alteração futura.

Aplicação no projeto: constantes como tamanho do shortcode (4), TTL do cache,
expiração do JWT, etc, devem ficar em `shared/constants` (ou em `.env` quando
forem configuráveis), nunca hardcoded inline.

---

## 6. Métodos gigantes

### Ruim
```ts
async function processOrder(order) {
  validate(order);
  calculatePrice(order);
  reserveInventory(order);
  createInvoice(order);
  sendEmail(order);
  generateAudit(order);
  publishEvent(order);
}
```
Problemas: muitas responsabilidades, difícil testar, difícil reutilizar.

### Melhor
```ts
async function processOrder(order) {
  const validatedOrder = validateOrder(order);
  const pricing = calculatePricing(validatedOrder);
  await reserveItems(validatedOrder);
  const invoice = await createInvoice(validatedOrder);
  await notifyCustomer(invoice);
  await auditOrder(invoice);
  await publishOrderProcessed(invoice);
}
```
Benefícios: responsabilidades separadas, mais legível, mais reutilizável.

---

## 7. Dependências escondidas

### Ruim
```ts
import axios from 'axios';

export async function getCustomer(id: string) {
  return axios.get(`/customers/${id}`);
}
```
Problemas: acoplamento direto, testes mais difíceis, troca de biblioteca complexa.

### Melhor
```ts
export class CustomerGateway {
  constructor(private readonly httpClient: HttpClient) {}

  async getCustomer(id: string) {
    return this.httpClient.get(`/customers/${id}`);
  }
}
```
Benefícios: inversão de dependência, fácil mock, fácil substituição.

Aplicação no projeto: clientes de cassandra/redis são encapsulados em classes/gateways
dentro de `application/repository` e `application/services`, injetados via construtor
nos usecases (sem singletons globais importados diretamente no domínio).

---

## 8. Código defensivo

### Ruim
```ts
const amount = response.data.customer.account.balance.value;
```
Problemas: quebra facilmente, assumptions perigosas.

### Melhor
```ts
const amount = response?.data?.customer?.account?.balance?.value;

if (amount === undefined) {
  throw new BalanceNotFoundError();
}
```
Benefícios: falha controlada, erros explícitos, mais resiliente.

---

## Características de um desenvolvedor sênior

Menos foco em:
- Frameworks da moda
- Design patterns desnecessários
- Abstrações prematuras
- Código "inteligente demais"
- One-liners difíceis de entender

Mais foco em:
- Código previsível
- Observabilidade
- Logs estruturados
- Tratamento de falhas
- Testes relevantes
- Contratos claros
- Baixo acoplamento
- Facilidade de manutenção

## Regra de ouro

> Código sênior não é o código que impressiona quem escreveu, é o código que não
> impressiona ninguém — porque é simples, óbvio e funciona.

---

# Boas práticas com Hono

## Estrutura de rotas
- Controllers devem ser finos: apenas parseiam/validam input (zod), chamam um usecase
  e traduzem o resultado/erro para a resposta HTTP. Nenhuma regra de negócio no controller.
- Agrupar rotas relacionadas com `app.route()` e `Hono` sub-apps por domínio
  (ex: `auth.routes.ts`, `urls.routes.ts`).

## Validação
- Usar `zod` + `@hono/zod-validator` (`zValidator`) em todos os endpoints que recebem
  body, query ou params. Nunca confiar em `c.req.json()` sem validação.
- Os schemas zod são a fonte da verdade tanto para validação quanto para a
  documentação OpenAPI (tarefa 07).

## Middlewares
- Autenticação (JWT), logging e error handling devem ser middlewares globais ou
  por grupo de rotas, nunca duplicados em cada handler.
- Middleware de autenticação injeta o usuário no contexto (`c.set('user', ...)`)
  com um tipo bem definido (usar `Hono<{ Variables: AppVariables }>`).

## Tratamento de erros
- Usar `app.onError()` como error handler central. Erros de domínio (classes
  customizadas) são mapeados para status HTTP nesse único lugar.
- Handlers não devem usar `try/catch` para converter erro em resposta — apenas
  lançar o erro de domínio e deixar o `onError` cuidar da tradução.

## Contexto e tipagem
- Tipar `Hono<{ Bindings: ...; Variables: ... }>` no app principal e reutilizar
  esse tipo em todos os sub-apps/rotas, evitando `any` no `c.env`/`c.get()`.

## Performance
- Handlers devem ser `async` e não bloquear o event loop com loops síncronos pesados
  (ex: hashing de senha deve usar implementação assíncrona).
- Evitar middlewares que façam I/O desnecessário em rotas que não precisam
  (ex: não aplicar middleware de auth em `GET /:shortcode`, que é público).

---

# Evitando problema de N+1

O problema de N+1 ocorre quando o código faz 1 query para buscar uma lista e depois
N queries adicionais (uma por item) para buscar dados relacionados — comum em
repositories e usecases que iteram sobre resultados.

## Sintomas no código (ruim)
```ts
const urls = await urlRepository.findAllByUser(userId); // 1 query

for (const url of urls) {
  url.stats = await statsRepository.getByShortcode(url.shortcode); // N queries
}
```
Problemas: latência cresce linearmente com o número de itens, sobrecarrega
Cassandra/Redis, comportamento "funciona no dev, quebra em produção".

## Como evitar

1. **Batch fetch**: buscar todos os dados relacionados de uma vez, usando os IDs
   coletados da primeira query.
   ```ts
   const urls = await urlRepository.findAllByUser(userId);
   const shortcodes = urls.map((u) => u.shortcode);
   const statsByShortcode = await statsRepository.getByShortcodes(shortcodes); // 1 query

   const result = urls.map((url) => ({
     ...url,
     stats: statsByShortcode.get(url.shortcode),
   }));
   ```

2. **Repositories devem expor métodos em lote** (`findManyByIds`, `getByShortcodes`),
   não apenas singulares. Se um usecase precisa enriquecer uma lista, o repository
   deve oferecer a versão "many" da consulta.

3. **Cassandra**: modelar as tabelas para permitir `IN (...)` ou partition keys
   que viabilizem busca em lote (token-aware). Evitar fan-out de queries por
   partition em loop.

4. **Redis**: usar `MGET`/pipeline/`MULTI` para buscar múltiplas chaves de uma vez
   em vez de N comandos `GET` sequenciais.

5. **Revisão obrigatória**: qualquer `for`/`map`/`forEach` que contenha `await` de
   uma chamada a repository/gateway dentro do loop deve ser questionado em code
   review — é o sinal mais comum de N+1.

6. **Testes**: testes de integração para endpoints que retornam listas (ex:
   `GET /urls`, stats) devem validar o número de queries/chamadas executadas
   (via spy/mock no repository), não apenas o resultado final.
