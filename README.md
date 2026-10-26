# IGOapp — Sistema de Gestão de Estacionamento

Sistema web para gerenciar estacionamentos: registro de entrada e saída de veículos, controle de vagas por pátio, cálculo automático do valor a pagar, pagamento simulado na saída e um painel com indicadores, previsão de ocupação e leitura de placa por foto com IA.

Projeto acadêmico desenvolvido em equipe. Front-end em **React + Vite**, back-end em **Supabase** (PostgreSQL, autenticação e segurança por linha).

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Inteligência Artificial](#inteligência-artificial)
- [Regras de negócio](#regras-de-negócio)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Banco de dados](#banco-de-dados)
- [Como rodar](#como-rodar)
- [Limitações conhecidas e trabalhos futuros](#limitações-conhecidas-e-trabalhos-futuros)
- [Equipe](#equipe)

---

## Funcionalidades

O sistema tem dois perfis de usuário. Depois do login, ambos usam o mesmo **menu lateral** (ícone no canto superior direito, ao lado do perfil); só mudam as opções exibidas.

### Operador

- **Painel (Dashboard):** vagas livres/ocupadas, veículos estacionados agora, faturamento do dia, ocupação por pátio, lista de veículos no pátio, histórico recente de saídas, detalhes de cada veículo e o bloco de IA (insights e previsão).
- **Operação:**
  - **Registrar entrada:** a placa pode ser **digitada** ou **lida por foto** (IA). Se a placa já existe no banco, modelo, tipo, proprietário e telefone são preenchidos automaticamente. O operador escolhe uma vaga livre e confirma.
  - **Registrar saída:** mostra o valor calculado e abre uma tela de **pagamento simulado**. Ao confirmar, a vaga é liberada e aparece **"Acesso Liberado"**; no caso de falha simulada, aparece **"Acesso Negado"** e nada é gravado.
- **Consulta de vagas:** status (livre/ocupada) de todas as vagas, agrupadas por pátio.
- **Consulta de preços:** tabela de preços vigente por pátio e tipo de veículo (somente leitura).

### Administrador

Tudo o que o operador faz, mais:

- **Gerenciar usuários:** lista todos os usuários e permite alterar perfil (operador/administrador) e status (ativo/inativo). O admin não consegue alterar o próprio perfil/status (trava para não se trancar para fora do sistema).
- **Gestão de preços:** edita valor por hora, valor da fração e tolerância de cada pátio e tipo de veículo.

### Acesso

- Login, cadastro, recuperação de senha ("Esqueci minha senha") e redefinição de senha, todos via Supabase Auth.
- Rotas internas protegidas: sem login, o usuário é redirecionado para `/login`.
- Todo cadastro novo nasce como **operador**. Virar administrador é uma promoção manual (ver [Primeiro administrador](#primeiro-administrador)).

---

## Inteligência Artificial

O projeto usa dois tipos de IA, com papéis diferentes.

### 1. Leitura de placa por foto (Google Gemini)

Na tela de **Registrar entrada**, o operador pode, em vez de digitar, enviar uma foto da placa:

1. O operador tira (ou seleciona) uma foto da placa.
2. A foto é enviada à API do **Google Gemini**, modelo com visão.
3. O Gemini devolve o texto da placa e o campo é preenchido automaticamente.
4. O sistema procura a placa no banco; se o veículo já existe, preenche também os demais dados.
5. O operador **confere** a leitura, ajusta se precisar e segue o fluxo normal de entrada.

<!-- TODO: confirmar se a chamada ao Gemini é feita direto do front-end ou por uma Edge Function do Supabase e ajustar o passo 2 e a seção de variáveis de ambiente. -->

Pontos importantes:

- **A digitação manual continua sempre disponível.** A foto é um atalho; se a leitura falhar (placa suja, ângulo ruim, sem câmera), o operador digita normalmente.
- A IA só preenche o campo: quem decide registrar a entrada e escolher a vaga é sempre o operador.
- A API do Gemini é usada na **camada gratuita**, que tem limites de requisições e termos próprios de uso de dados. Confira os limites e os termos atuais no Google AI Studio; na camada gratuita, o conteúdo enviado pode ser usado pelo Google para melhorar seus produtos.

### 2. Previsão de ocupação e sugestão de preço (SQL)

Funções estatísticas escritas em SQL, rodando dentro do banco (sem serviço externo e sem custo):

| Função | O que faz |
|---|---|
| `prever_ocupacao(patio, dia, hora)` | Média histórica de veículos presentes no mesmo dia da semana e na mesma hora, dividida pela capacidade do pátio (resultado de 0 a 1). |
| `sugerir_preco(valor_base, ocupacao)` | Aplica um multiplicador conforme a demanda prevista. |
| `previsao_completa(...)` | Junta ocupação prevista, preço-base, preço sugerido, número de amostras e uma explicação em texto. |
| `painel_ia()` | Resume o sistema (ocupação, faturamento, ticket médio, permanência média, horário e dia de pico, ocupação por pátio) numa única chamada. |

Multiplicadores do preço sugerido:

| Ocupação prevista | Multiplicador | Interpretação |
|---|---|---|
| 85% ou mais | × 1,30 | Alta demanda (tarifa de pico) |
| 60% a 84% | × 1,15 | Demanda moderada-alta |
| 30% a 59% | × 1,00 | Normal |
| Abaixo de 30% | × 0,85 | Baixa demanda (desconto de incentivo) |

> **O preço sugerido é apenas informativo.** O valor realmente cobrado vem sempre da tabela de preços oficial (`tabela_preco`). Aplicar o reajuste sugerido é uma decisão humana: alguém precisa editar os preços.

Limitações: a previsão depende de histórico (sem amostras, o resultado é 0) e é uma média simples por dia/hora, sem considerar feriados, clima ou eventos.

---

## Regras de negócio

1. **Perfis:** operador opera o dia a dia; administrador também gerencia usuários e preços. Cada tabela tem regras de acesso aplicadas no banco (RLS), que não dependem da interface esconder botões.
2. **Cadastro:** uma trigger (`handle_new_user`) cria a linha em `usuario` automaticamente, sempre como operador, ignorando qualquer perfil enviado pelo front-end.
3. **Entrada:** `registrar_entrada` cria a transação e marca a vaga como ocupada de forma atômica. Vaga já ocupada é recusada.
4. **Cobrança:** o preço depende do **pátio** e do **tipo de veículo** (carro/moto).
   - Permanência menor ou igual à tolerância: **R$ 0,00**.
   - Caso contrário: `horas cheias × valor por hora` + `valor da fração` se sobrarem minutos.
5. **Saída e pagamento (simulado):** o valor é mostrado antes de qualquer gravação. Só depois de **confirmar o pagamento** a função `registrar_saida` fecha a transação, grava o valor oficial e libera a vaga. Se o pagamento falhar (simulado), nada é gravado e o veículo continua no pátio.
6. **Cancela (simulada):** a liberação é apenas a mensagem "Acesso Liberado" na tela, sem hardware.
7. **Horários:** exibidos no fuso de Brasília (`America/Sao_Paulo`).

Exemplo de cobrança, com carro a R$ 6,00/hora, fração de R$ 3,00 e tolerância de 15 minutos:

| Permanência | Cálculo | Valor |
|---|---|---|
| 12 min | dentro da tolerância | R$ 0,00 |
| 1h00 | 1 hora cheia | R$ 6,00 |
| 1h20 | 1 hora cheia + fração | R$ 9,00 |
| 2h05 | 2 horas cheias + fração | R$ 15,00 |

---

## Tecnologias

- **React 19** e **Vite** — interface e ambiente de desenvolvimento
- **react-router-dom** — rotas e proteção de telas
- **Supabase** — PostgreSQL, autenticação, RLS e API automática
- **@supabase/supabase-js** — comunicação do front-end com o Supabase
- **Google Gemini API** — leitura de placa por foto

Não há servidor próprio (Node/Flask): o front-end conversa direto com o Supabase.

---

## Arquitetura

```
Navegador (React + Vite)
   │
   ├── supabase-js ──► Supabase
   │                    ├─ Auth (login, cadastro, recuperação de senha)
   │                    ├─ Postgres (tabelas, triggers, funções SQL, RLS)
   │                    └─ funções de IA estatística (RPC)
   │
   └── foto da placa ──► API do Google Gemini (leitura da placa)
```

O front-end lê e grava tabelas com `supabase.from(...)` e chama funções do banco com `supabase.rpc(...)`. A segurança fica no banco (RLS). A chave `anon` do Supabase é pública por natureza; quem protege os dados são as políticas de RLS.

---

## Estrutura de pastas

```
src/
  main.jsx                 ponto de entrada do React
  App.jsx                  rotas da aplicação
  index.css                estilos globais e animações
  assets/                  logos e imagem de fundo
  lib/
    supabaseClient.js      conexão com o Supabase
  components/
    RotaPrivada.jsx        protege telas que exigem login
    MenuLateral.jsx        menu lateral por perfil
  pages/
    Login.jsx  Cadastro.jsx  EsqueciSenha.jsx  RedefinirSenha.jsx
    Dashboard.jsx          painel com indicadores e IA
    Operacao.jsx           entrada, saída e pagamento simulado
    ConsultaVagas.jsx      status das vagas por pátio
    ConsultaPrecos.jsx     tabela de preços (leitura)
    GestaoPrecos.jsx       edição de preços (admin)
    Usuarios.jsx           gerenciar usuários (admin)
supabase/
  migrations/              arquivos .sql de tabelas, segurança e funções
  seed.sql                 dados de exemplo
```

---

## Banco de dados

Seis tabelas no schema `public`, todas com RLS habilitado:

| Tabela | O que guarda |
|---|---|
| `patio` | Pátios: nome, endereço e capacidade total |
| `vaga` | Vagas: número, tipo, pátio e status (livre/ocupada) |
| `tabela_preco` | Preço por pátio e tipo de veículo: valor/hora, valor da fração, tolerância em minutos |
| `veiculo` | Placa, modelo, tipo, nome e telefone do proprietário |
| `usuario` | Usuários do sistema: nome, e-mail, tipo, perfil, status, vínculo com o login do Supabase (`auth_user_id`) |
| `transacao` | Cada estadia: veículo, vaga, operador, hora de entrada e saída, valor calculado e status |

O pátio de uma transação é obtido pela vaga (`transacao.vaga_id → vaga.patio_id`).

**Funções e triggers:** `is_admin()`, `handle_new_user`, `calcular_valor_transacao`, `registrar_entrada`, `registrar_saida`, `painel_ia`, `prever_ocupacao`, `sugerir_preco`, `previsao_completa`.

**Segurança (RLS), em resumo:**

- Usuário comum vê e edita só a própria linha em `usuario`; admin vê e edita todas.
- Só admin cria, edita ou apaga pátios e preços.
- Qualquer usuário autenticado pode operar entradas e saídas.
- Só admin apaga registros.

---

## Como rodar

### Pré-requisitos

- Node.js 18 ou superior (recomendado 20+)
- Um projeto no [Supabase](https://supabase.com)
- Uma chave da API do Gemini ([Google AI Studio](https://aistudio.google.com))

### Instalação

```bash
git clone https://github.com/EduardaMaria31/IGOapp.git
cd IGOapp
npm install
```

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto (ele não vai para o GitHub, está no `.gitignore`):

```
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<chave anon/publishable do seu projeto>
VITE_GEMINI_API_KEY=<sua chave da API do Gemini>
```

O prefixo `VITE_` é obrigatório para o Vite expor a variável ao front-end. Peça os valores do projeto à equipe; não os coloque no código nem no repositório.

> **Segurança:** variáveis `VITE_` ficam visíveis no navegador. Em produção, o ideal é intermediar a chamada ao Gemini por uma Edge Function do Supabase, mantendo a chave como secret no servidor.

### Configuração do Supabase

1. **Banco:** aplique os arquivos de `supabase/migrations/` em ordem cronológica (pelo prefixo de data do nome) no SQL Editor do Supabase. Opcionalmente, rode `supabase/seed.sql` para carregar pátios, preços, vagas e veículos de exemplo. Os usuários do seed não têm login real.
2. **URLs de autenticação:** em *Authentication → URL Configuration*, defina o **Site URL** como `http://localhost:5173` e adicione `http://localhost:5173/**` em **Redirect URLs** (necessário para os links de confirmação de e-mail e recuperação de senha).
3. **Confirmação de e-mail:** por padrão o Supabase exige confirmar o e-mail antes do primeiro login. Para agilizar testes, dá para desativar em *Authentication → Providers → Email*.
4. **Projetos gratuitos pausam por inatividade.** Se o app parar de responder, abra o painel do Supabase e restaure o projeto.

### Executando

```bash
npm run dev
```

Abra o endereço exibido no terminal (geralmente `http://localhost:5173`).

### Primeiro administrador

Como todo cadastro nasce operador, o primeiro admin precisa ser promovido direto no banco. Cadastre-se normalmente pelo app e, no SQL Editor do Supabase, rode:

```sql
update public.usuario
set perfil = 'administrador'
where email = 'seu-email@exemplo.com';
```

Depois disso, esse admin pode promover outros usuários pela tela **Gerenciar usuários**.

---

## Limitações conhecidas e trabalhos futuros

- **Pagamento simulado:** não há integração com gateway (PIX, cartão). Integração real é um próximo passo.
- **Cancela simulada:** a liberação é uma mensagem na tela. Integrar uma cancela física (por exemplo, com Arduino ou outro dispositivo) fica como trabalho futuro.
- **Gestão de pátios e vagas:** ainda não há telas para criar/remover pátios e vagas; hoje isso é feito direto no banco (Table Editor do Supabase). A gestão de preços já tem tela.
- **Dados do cadastro:** CPF, telefone e data de nascimento são coletados no cadastro, mas ainda não são gravados na tabela `usuario` (ficam apenas nos metadados do Supabase Auth).
- **Login:** apenas por e-mail. A opção "Lembrar de mim" é visual por enquanto.
- **Sem tela para cliente do estacionamento:** o painel expõe placas e horários de outras pessoas, então não faz sentido torná-lo público. Um painel de vagas disponíveis para clientes fica como ideia futura.
- **IA estatística:** depende de histórico e não considera feriados, clima ou eventos.
- **Leitura de placa:** depende da qualidade da foto e dos limites da camada gratuita do Gemini; a digitação manual é sempre a alternativa.

---

## Equipe

<!-- TODO: preencher com os nomes e papéis dos 7 integrantes. -->

| Integrante | Papel |
|---|---|
| | Backend / Banco de dados |
| | Front-end — telas de acesso |
| | Front-end — telas de operação e Dashboard |
| | IA / Agente |
| | Integração e DevOps |
| | UX e documentação |

---

Projeto acadêmico. Material de apoio e documentação técnica detalhada podem ser consultados com a equipe.
