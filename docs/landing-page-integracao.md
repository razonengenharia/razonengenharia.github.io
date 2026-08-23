# RiskPDA — Guia de Integração com a Landing Page

> **Este arquivo vive em `docs/riskpda-integracao.md` no repo da landing page.**  
> Ao abrir uma sessão de Claude neste repo, comece dizendo:  
> *"Leia `docs/riskpda-integracao.md` — ele tem todo o contexto do produto RiskPDA."*

---

## O que é o RiskPDA

Ferramenta SaaS de cálculo de risco de descargas atmosféricas conforme **NBR 5419-2:2026**.  
Desenvolvida pela Razon Engenharia para engenheiros elétricos e civis.  
O app vive em `https://riskpda.razonengenharia.com.br` — separado do site institucional.

---

## O que precisa ser feito neste repo

| # | Tarefa | Arquivo/Rota |
|---|--------|--------------|
| 1 | Publicar Política de Privacidade | `/privacidade` → conteúdo em `docs/politica-de-privacidade.md` |
| 2 | Publicar Termos de Uso | `/termos` → conteúdo em `docs/termos-de-uso.md` |
| 3 | Links no **rodapé** do site | "Termos de Uso" → /termos · "Política de Privacidade" → /privacidade |
| 4 | Card RiskPDA na página `/ferramentas` | Card com planos, preços e botões de compra |

---

## URLs de produção

| Destino | URL |
|---------|-----|
| App — login | `https://riskpda.razonengenharia.com.br/riskpda.html` |
| App — dashboard | `https://riskpda.razonengenharia.com.br/dashboard.html` |
| Termos de Uso (site) | `https://razonengenharia.com.br/termos` |
| Política de Privacidade (site) | `https://razonengenharia.com.br/privacidade` |
| Suporte / cancelamento | `suporte@razonengenharia.com.br` |

---

## Checkouts Kiwify — links de compra

> Estes links são os botões "Assinar" dos cards. Apontam direto para o checkout da Kiwify — sem redirecionamento interno.

| Plano | Link de checkout | Preço | Laudos/mês |
|-------|-----------------|-------|------------|
| **Básico — Mensal** | `https://pay.kiwify.com.br/lzK6PPz` | R$ 19,90/mês | 5 |
| **Básico — Anual** | `https://pay.kiwify.com.br/Bui5OnG` | R$ 167,16/ano · ~R$ 13,93/mês | 5 |
| **PRO — Mensal** | `https://pay.kiwify.com.br/LhXvQ3A` | R$ 59,90/mês | Ilimitado |
| **PRO — Anual** | `https://pay.kiwify.com.br/45ShTcA` | R$ 499,90/ano · ~R$ 41,66/mês | Ilimitado |

---

## Card de planos — estrutura

O card deve ter **toggle Mensal / Anual** que troca os preços e os links de compra simultaneamente.

### Plano Básico
- Mensal: R$ 19,90 → `pay.kiwify.com.br/lzK6PPz`
- Anual: R$ 13,93/mês (cobrado R$ 167,16) → `pay.kiwify.com.br/Bui5OnG`
- Funcionalidades: 5 laudos/mês · NBR 5419-2:2026 · download DOCX

### Plano PRO
- Mensal: R$ 59,90 → `pay.kiwify.com.br/LhXvQ3A`
- Anual: R$ 41,66/mês (cobrado R$ 499,90) → `pay.kiwify.com.br/45ShTcA`
- Funcionalidades: Laudos ilimitados · tudo do Básico · suporte prioritário

### Botão secundário
- "Já tenho conta / Acessar o app" → `https://riskpda.razonengenharia.com.br/riskpda.html`

---

## Fluxo completo do novo usuário

```
/ferramentas (este site)
  └─ card RiskPDA → "Assinar Básico Mensal"
       └─ pay.kiwify.com.br/lzK6PPz  ← checkout Kiwify
            └─ pagamento aprovado
                 └─ Kiwify dispara webhook → app cria usuário automaticamente
                      └─ usuário recebe email com login e senha temporária
                           └─ acessa riskpda.razonengenharia.com.br
                                └─ primeiro login → tela de aceite de Termos (gate)
                                     └─ aceita → dashboard ✅
```

**Não existe cadastro público.** A conta é criada automaticamente quando o pagamento é aprovado.  
Nenhuma integração técnica é necessária entre este site e o app — o checkout Kiwify é o elo.

---

## Rodapé do site

Adicionar à seção de links legais existente no rodapé:

```
Termos de Uso        → /termos
Política de Privacidade → /privacidade
```

Esses links são referenciados dentro do app na tela de aceite pós-login — **precisam estar no ar antes de o produto ser lançado publicamente.**

---

## Documentos legais neste repo

| Arquivo | Rota publicada | Observação |
|---------|----------------|------------|
| `docs/termos-de-uso.md` | `/termos` | Versão 1.0 · agosto/2026 |
| `docs/politica-de-privacidade.md` | `/privacidade` | Versão 1.0 · agosto/2026 |

Os textos estão prontos. Basta publicá-los nas rotas acima conforme o framework do site.  
Não editar o conteúdo sem consultar — versão 1.0 está referenciada no banco do app.

---

## O que NÃO precisa ser feito aqui

- ❌ Cadastro de usuários — feito 100% via Kiwify + webhook automático
- ❌ Integração com API do app — não existe nem é necessária
- ❌ Adicionar texto de termos no checkout Kiwify — a plataforma já exibe o próprio rodapé legal; texto adicional ficaria tosco e sem link clicável
- ❌ "Esqueci minha senha" — feature futura no app
