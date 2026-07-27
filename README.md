# PWA — Controle de Visitas Técnicas

## Recursos incluídos
- Formulário responsivo para celular e navegador
- Funcionamento offline após o primeiro acesso
- Assinatura do vistoriador e do cliente
- Fotos pela câmera ou galeria
- Cálculo automático de quilometragem e tempo de atendimento
- Materiais dinâmicos
- Histórico pesquisável
- Edição, exclusão, impressão e salvamento em PDF
- Backup em JSON
- Instalação como aplicativo (PWA)

## Como testar localmente
O PWA precisa ser aberto por HTTP/HTTPS, não diretamente com file://.

Com Python instalado:
1. Abra o terminal dentro desta pasta.
2. Execute:
   python -m http.server 8080
3. Acesse:
   http://localhost:8080

No celular, publique a pasta em um serviço HTTPS como Vercel, Netlify, Firebase Hosting ou servidor próprio.

## Importante
Esta versão salva os dados somente no aparelho/navegador usando localStorage.
Para uso multiusuário, sincronização entre técnicos e dashboard central, será necessário conectar um backend, como Supabase ou Firebase.

## Próxima evolução recomendada
- Login individual por técnico
- Banco de dados central
- Painel administrativo
- Cadastro de clientes e contratos
- Geração de PDF padronizado no servidor
- Envio por e-mail/WhatsApp
- Geolocalização
- Indicadores de retorno, quilometragem e primeira resolução
