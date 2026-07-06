// ═══════════════════════════════════════════════════════════════════════════
// DADOS DEMO — 100% fictícios, para o modo /demo (visão de parceiros).
// Nenhum dado real de cliente, valor, catálogo ou financeiro da RARO aparece aqui.
// Cliente, endereço, contato e números são inventados. Estrutura fiel a um
// projeto RARO típico para que TODAS as funcionalidades tenham o que exibir.
// ═══════════════════════════════════════════════════════════════════════════

const I = (name, category, icon, qty, sale, cost) => ({
  name, category, icon, qty,
  sale_price: sale, cost_price: cost, price: sale * qty,
})

// ── Cliente demo ────────────────────────────────────────────────────────────
export const DEMO_CLIENT = {
  id: 90001,
  name: 'Thiago Andrade',
  name1: 'Thiago',
  name2: '',
  full_name1: 'Thiago Andrade',
  full_name2: '',
  full_name: 'Thiago Andrade',
  email: 'contato.demo@exemplo.com',
  phone: '(21) 90000-0000',
  phone1: '(21) 90000-0000',
  housing_type: 'residencial',
  street: 'Rua das Palmeiras Douradas',
  number: '128',
  complement: 'Casa',
  neighborhood: 'Jardim Aurora',
  city: 'Rio de Janeiro',
  state: 'RJ',
  cep: '20000-000',
  area_m: 320,
  total_rooms: 9,
  created_at: '2026-05-02T10:00:00.000Z',
}

// ── Estrutura de ambientes/itens (proposta) ─────────────────────────────────
const FLOORS = [
  { name: 'Térreo', icon: '◈', rooms: [
    { name: 'Sala de Estar', icon: '◉', price: 8400, items: [
      I('Keypad 4 teclas', 'Automação', '⬡', 2, 890, 520),
      I('Módulo de iluminação 4 canais', 'Automação', '▣', 1, 1650, 980),
      I('Caixa de som embutida', 'Som', '◍', 4, 620, 360),
    ]},
    { name: 'Cozinha / Gourmet', icon: '◉', price: 6200, items: [
      I('Keypad 2 teclas', 'Automação', '⬡', 1, 690, 400),
      I('Caixa de som embutida', 'Som', '◍', 2, 620, 360),
      I('Sensor de presença mmW', 'Sensor', '◈', 1, 540, 310),
    ]},
    { name: 'Varanda', icon: '◉', price: 4100, items: [
      I('Câmera externa 4MP', 'Câmera', '◆', 2, 780, 460),
      I('Módulo de cortina', 'Automação', '▣', 1, 1200, 720),
    ]},
    { name: 'Área Externa', icon: '◉', price: 5300, items: [
      I('Câmera externa 4MP', 'Câmera', '◆', 3, 780, 460),
      I('Access Point Wi-Fi 6', 'Rede', '◈', 1, 1100, 650),
    ]},
  ]},
  { name: 'Superior', icon: '◈', rooms: [
    { name: 'Suíte Master', icon: '◉', price: 5600, items: [
      I('Keypad 4 teclas', 'Automação', '⬡', 1, 890, 520),
      I('Módulo de cortina', 'Automação', '▣', 2, 1200, 720),
      I('Caixa de som embutida', 'Som', '◍', 2, 620, 360),
    ]},
    { name: 'Suíte 2', icon: '◉', price: 3200, items: [
      I('Keypad 2 teclas', 'Automação', '⬡', 1, 690, 400),
      I('Módulo de cortina', 'Automação', '▣', 1, 1200, 720),
    ]},
    { name: 'Home Office', icon: '◉', price: 2800, items: [
      I('Access Point Wi-Fi 6', 'Rede', '◈', 1, 1100, 650),
      I('Keypad 2 teclas', 'Automação', '⬡', 1, 690, 400),
    ]},
    { name: 'Circulação', icon: '◉', price: 1400, items: [
      I('Sensor de presença mmW', 'Sensor', '◈', 2, 540, 310),
    ]},
  ]},
]

export const DEMO_STOCK = [{"id": 9001, "code": "KP4-001", "name": "Keypad 4 teclas", "category": "Automação", "qty": 12, "min_qty": 4, "cost_price": 520, "unit_price": 890, "buy_link": "", "supplier_id": ""}, {"id": 9002, "code": "KP2-001", "name": "Keypad 2 teclas", "category": "Automação", "qty": 3, "min_qty": 4, "cost_price": 400, "unit_price": 690, "buy_link": "", "supplier_id": ""}, {"id": 9003, "code": "SP-EMB", "name": "Caixa de som embutida", "category": "Som", "qty": 20, "min_qty": 6, "cost_price": 360, "unit_price": 620, "buy_link": "", "supplier_id": ""}, {"id": 9004, "code": "COR-01", "name": "Módulo de cortina", "category": "Automação", "qty": 0, "min_qty": 2, "cost_price": 720, "unit_price": 1200, "buy_link": "", "supplier_id": ""}, {"id": 9005, "code": "CAM-4MP", "name": "Câmera externa 4MP", "category": "Câmera", "qty": 8, "min_qty": 3, "cost_price": 460, "unit_price": 780, "buy_link": "", "supplier_id": ""}, {"id": 9006, "code": "AP-WIFI6", "name": "Access Point Wi-Fi 6", "category": "Rede", "qty": 5, "min_qty": 2, "cost_price": 650, "unit_price": 1100, "buy_link": "", "supplier_id": ""}, {"id": 9007, "code": "SEN-MMW", "name": "Sensor de presença mmW", "category": "Sensor", "qty": 14, "min_qty": 5, "cost_price": 310, "unit_price": 540, "buy_link": "", "supplier_id": ""}]

export const DEMO_PLANTA = {
  image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAwIDYyMCIgd2lkdGg9IjEwMDAiIGhlaWdodD0iNjIwIj4KICA8cmVjdCB3aWR0aD0iMTAwMCIgaGVpZ2h0PSI2MjAiIGZpbGw9IiNGOEY3RjQiLz4KICA8IS0tIGNvbnRvcm5vIGV4dGVybm8gLS0+CiAgPHJlY3QgeD0iNDAiIHk9IjQwIiB3aWR0aD0iOTIwIiBoZWlnaHQ9IjU0MCIgZmlsbD0iI0ZGRkZGRiIgc3Ryb2tlPSIjMkIyQjJCIiBzdHJva2Utd2lkdGg9IjYiLz4KICA8IS0tIHBhcmVkZXMgaW50ZXJuYXMgLS0+CiAgPGcgc3Ryb2tlPSIjMkIyQjJCIiBzdHJva2Utd2lkdGg9IjQiIGZpbGw9Im5vbmUiPgogICAgPCEtLSBkaXZpc8OzcmlhIHZlcnRpY2FsIGNlbnRyYWwgLS0+CiAgICA8bGluZSB4MT0iNDcwIiB5MT0iNDAiIHgyPSI0NzAiIHkyPSIzNjAiLz4KICAgIDwhLS0gaG9yaXpvbnRhbCBzZXBhcmFuZG8gc29jaWFsIGRlIMOtbnRpbW8gLS0+CiAgICA8bGluZSB4MT0iNDAiIHkxPSIzNjAiIHgyPSI5NjAiIHkyPSIzNjAiLz4KICAgIDwhLS0gc3XDrXRlczogZGl2aXPDs3JpYSB2ZXJ0aWNhbCAtLT4KICAgIDxsaW5lIHgxPSI1MDAiIHkxPSIzNjAiIHgyPSI1MDAiIHkyPSI1ODAiLz4KICAgIDwhLS0gYmFuaG8gZW50cmUgc3XDrXRlcyAtLT4KICAgIDxsaW5lIHgxPSI3MjAiIHkxPSIzNjAiIHgyPSI3MjAiIHkyPSI1ODAiLz4KICAgIDwhLS0gY296aW5oYS9lc3RhciBkaXZpc8OzcmlhIHN1cGVyaW9yIGRpcmVpdGEgLS0+CiAgICA8bGluZSB4MT0iNzAwIiB5MT0iNDAiIHgyPSI3MDAiIHkyPSIzNjAiLz4KICA8L2c+CiAgPCEtLSBhYmVydHVyYXMgZGUgcG9ydGEgKHbDo29zIGJyYW5jb3Mgc29icmUgcGFyZWRlKSAtLT4KICA8ZyBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iNyI+CiAgICA8bGluZSB4MT0iNDcwIiB5MT0iMTgwIiB4Mj0iNDcwIiB5Mj0iMjMwIi8+CiAgICA8bGluZSB4MT0iMjUwIiB5MT0iMzYwIiB4Mj0iMzAwIiB5Mj0iMzYwIi8+CiAgICA8bGluZSB4MT0iNjAwIiB5MT0iMzYwIiB4Mj0iNjUwIiB5Mj0iMzYwIi8+CiAgICA8bGluZSB4MT0iODIwIiB5MT0iMzYwIiB4Mj0iODcwIiB5Mj0iMzYwIi8+CiAgICA8bGluZSB4MT0iNzAwIiB5MT0iMTUwIiB4Mj0iNzAwIiB5Mj0iMjAwIi8+CiAgPC9nPgogIDwhLS0gYXJjb3MgZGUgcG9ydGEgLS0+CiAgPGcgc3Ryb2tlPSIjQjBCMEIwIiBzdHJva2Utd2lkdGg9IjEuNSIgZmlsbD0ibm9uZSI+CiAgICA8cGF0aCBkPSJNNDcwIDIzMCBBNTAgNTAgMCAwIDEgNDIwIDE4MCIvPgogICAgPHBhdGggZD0iTTMwMCAzNjAgQTUwIDUwIDAgMCAxIDI1MCAzMTAiLz4KICAgIDxwYXRoIGQ9Ik02NTAgMzYwIEE1MCA1MCAwIDAgMSA2MDAgMzEwIi8+CiAgPC9nPgoKICA8IS0tIFNBTEEgREUgRVNUQVIgKHN1cGVyaW9yIGVzcXVlcmRhKSAtLT4KICA8Zz4KICAgIDxyZWN0IHg9IjkwIiB5PSIyMzAiIHdpZHRoPSIyMDAiIGhlaWdodD0iODAiIHJ4PSI4IiBmaWxsPSJub25lIiBzdHJva2U9IiM4QThBOEEiIHN0cm9rZS13aWR0aD0iMi41Ii8+CiAgICA8bGluZSB4MT0iMTEwIiB5MT0iMjMwIiB4Mj0iMTEwIiB5Mj0iMzEwIiBzdHJva2U9IiM4QThBOEEiIHN0cm9rZS13aWR0aD0iMi41Ii8+CiAgICA8bGluZSB4MT0iMjcwIiB5MT0iMjMwIiB4Mj0iMjcwIiB5Mj0iMzEwIiBzdHJva2U9IiM4QThBOEEiIHN0cm9rZS13aWR0aD0iMi41Ii8+CiAgICA8cmVjdCB4PSIxNTAiIHk9IjEyMCIgd2lkdGg9IjkwIiBoZWlnaHQ9IjU1IiByeD0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOEE4QThBIiBzdHJva2Utd2lkdGg9IjIuNSIvPgogIDwvZz4KICA8IS0tIENPWklOSEEgKHN1cGVyaW9yIGNlbnRybykgLS0+CiAgPGc+CiAgICA8cmVjdCB4PSI1MTAiIHk9IjcwIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjQwIiBmaWxsPSJub25lIiBzdHJva2U9IiM4QThBOEEiIHN0cm9rZS13aWR0aD0iMi41Ii8+CiAgICA8Y2lyY2xlIGN4PSI1NDUiIGN5PSI5MCIgcj0iOSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOEE4QThBIiBzdHJva2Utd2lkdGg9IjIiLz4KICAgIDxjaXJjbGUgY3g9IjU4MCIgY3k9IjkwIiByPSI5IiBmaWxsPSJub25lIiBzdHJva2U9IiM4QThBOEEiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgPHJlY3QgeD0iNTEwIiB5PSIxNTAiIHdpZHRoPSIxNTAiIGhlaWdodD0iNzAiIHJ4PSI2IiBmaWxsPSJub25lIiBzdHJva2U9IiM4QThBOEEiIHN0cm9rZS13aWR0aD0iMi41Ii8+CiAgPC9nPgogIDwhLS0gVkFSQU5EQSAoc3VwZXJpb3IgZGlyZWl0YSkgLS0+CiAgPGc+CiAgICA8cmVjdCB4PSI3NTAiIHk9IjEyMCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSI2MCIgcng9IjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhBOEE4QSIgc3Ryb2tlLXdpZHRoPSIyLjUiLz4KICAgIDxjaXJjbGUgY3g9Ijg4MCIgY3k9IjI2MCIgcj0iMjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhBOEE4QSIgc3Ryb2tlLXdpZHRoPSIyLjUiLz4KICA8L2c+CiAgPCEtLSBTVcONVEUgTUFTVEVSIChpbmZlcmlvciBlc3F1ZXJkYSkgLS0+CiAgPGc+CiAgICA8cmVjdCB4PSIxMTAiIHk9IjQzMCIgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxMTAiIHJ4PSI2IiBmaWxsPSJub25lIiBzdHJva2U9IiM4QThBOEEiIHN0cm9rZS13aWR0aD0iMi41Ii8+CiAgICA8bGluZSB4MT0iMTg1IiB5MT0iNDMwIiB4Mj0iMTg1IiB5Mj0iNDYwIiBzdHJva2U9IiM4QThBOEEiIHN0cm9rZS13aWR0aD0iMi41Ii8+CiAgICA8cmVjdCB4PSIzMDAiIHk9IjQ0MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjkwIiByeD0iNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOEE4QThBIiBzdHJva2Utd2lkdGg9IjIuNSIvPgogIDwvZz4KICA8IS0tIEJBTkhFSVJPIChpbmZlcmlvciBjZW50cm8pIC0tPgogIDxnPgogICAgPGVsbGlwc2UgY3g9IjYwMCIgY3k9IjQ0MCIgcng9IjI2IiByeT0iMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhBOEE4QSIgc3Ryb2tlLXdpZHRoPSIyLjUiLz4KICAgIDxyZWN0IHg9IjU2MCIgeT0iNDkwIiB3aWR0aD0iMzQiIGhlaWdodD0iNTAiIHJ4PSIxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOEE4QThBIiBzdHJva2Utd2lkdGg9IjIuNSIvPgogICAgPHJlY3QgeD0iNjMwIiB5PSI0OTAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI1MCIgcng9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhBOEE4QSIgc3Ryb2tlLXdpZHRoPSIyLjUiLz4KICA8L2c+CiAgPCEtLSBTVcONVEUgMiAoaW5mZXJpb3IgZGlyZWl0YSkgLS0+CiAgPGc+CiAgICA8cmVjdCB4PSI3NzAiIHk9IjQzMCIgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxMTAiIHJ4PSI2IiBmaWxsPSJub25lIiBzdHJva2U9IiM4QThBOEEiIHN0cm9rZS13aWR0aD0iMi41Ii8+CiAgICA8bGluZSB4MT0iODQ1IiB5MT0iNDMwIiB4Mj0iODQ1IiB5Mj0iNDYwIiBzdHJva2U9IiM4QThBOEEiIHN0cm9rZS13aWR0aD0iMi41Ii8+CiAgPC9nPgoKICA8IS0tIHLDs3R1bG9zIGRvcyBhbWJpZW50ZXMgLS0+CiAgPGcgZm9udC1mYW1pbHk9IidETSBTYW5zJywgQXJpYWwsIHNhbnMtc2VyaWYiIGZpbGw9IiMyQjJCMkIiIHRleHQtYW5jaG9yPSJtaWRkbGUiPgogICAgPHRleHQgeD0iMjU1IiB5PSIyMDUiIGZvbnQtc2l6ZT0iMjIiIGZvbnQtd2VpZ2h0PSI3MDAiPlNhbGEgZGUgRXN0YXI8L3RleHQ+CiAgICA8dGV4dCB4PSIyNTUiIHk9IjIyOCIgZm9udC1zaXplPSIxMyIgZmlsbD0iIzhBOEE4QSI+MTgsNCBtwrI8L3RleHQ+CiAgICA8dGV4dCB4PSI1ODUiIHk9IjI5MCIgZm9udC1zaXplPSIyMiIgZm9udC13ZWlnaHQ9IjcwMCI+Q296aW5oYTwvdGV4dD4KICAgIDx0ZXh0IHg9IjU4NSIgeT0iMzEzIiBmb250LXNpemU9IjEzIiBmaWxsPSIjOEE4QThBIj4xMiwxIG3CsjwvdGV4dD4KICAgIDx0ZXh0IHg9IjgzMCIgeT0iMzMwIiBmb250LXNpemU9IjIyIiBmb250LXdlaWdodD0iNzAwIj5WYXJhbmRhPC90ZXh0PgogICAgPHRleHQgeD0iODMwIiB5PSIzNTMiIGZvbnQtc2l6ZT0iMTMiIGZpbGw9IiM4QThBOEEiPjksNiBtwrI8L3RleHQ+CiAgICA8dGV4dCB4PSIyMzAiIHk9IjQwMCIgZm9udC1zaXplPSIyMiIgZm9udC13ZWlnaHQ9IjcwMCI+U3XDrXRlIE1hc3RlcjwvdGV4dD4KICAgIDx0ZXh0IHg9IjIzMCIgeT0iNDIzIiBmb250LXNpemU9IjEzIiBmaWxsPSIjOEE4QThBIj4xNiwyIG3CsjwvdGV4dD4KICAgIDx0ZXh0IHg9IjYxMCIgeT0iNDAwIiBmb250LXNpemU9IjIwIiBmb250LXdlaWdodD0iNzAwIj5CYW5obzwvdGV4dD4KICAgIDx0ZXh0IHg9IjYxMCIgeT0iNDIxIiBmb250LXNpemU9IjEzIiBmaWxsPSIjOEE4QThBIj41LDMgbcKyPC90ZXh0PgogICAgPHRleHQgeD0iODQ1IiB5PSI0MDAiIGZvbnQtc2l6ZT0iMjIiIGZvbnQtd2VpZ2h0PSI3MDAiPlN1w610ZSAyPC90ZXh0PgogICAgPHRleHQgeD0iODQ1IiB5PSI0MjMiIGZvbnQtc2l6ZT0iMTMiIGZpbGw9IiM4QThBOEEiPjEzLDcgbcKyPC90ZXh0PgogIDwvZz4KICA8IS0tIHTDrXR1bG8gLS0+CiAgPGcgZm9udC1mYW1pbHk9IidETSBTYW5zJywgQXJpYWwsIHNhbnMtc2VyaWYiIHRleHQtYW5jaG9yPSJzdGFydCI+CiAgICA8dGV4dCB4PSI1MiIgeT0iNzAiIGZvbnQtc2l6ZT0iMTciIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiNCNDUzMDkiIGxldHRlci1zcGFjaW5nPSIxIj5QTEFOVEEgQkFJWEEgwrcgUEFWSU1FTlRPIMOaTklDTzwvdGV4dD4KICA8L2c+Cjwvc3ZnPgo=',
  markers: [{"uid": "dm1", "x": 20, "y": 42, "n": 1, "name": "Keypad 4 teclas", "code": "KP-01", "room": "Sala de Estar", "cableType": "dados", "mount": "parede", "alt": "media"}, {"uid": "dm2", "x": 16, "y": 25, "n": 2, "name": "Caixa de som embutida", "code": "SP-01", "room": "Sala de Estar", "cableType": "som", "mount": "teto", "alt": "teto"}, {"uid": "dm3", "x": 34, "y": 48, "n": 3, "name": "Caixa de som embutida", "code": "SP-02", "room": "Sala de Estar", "cableType": "som", "mount": "teto", "alt": "teto"}, {"uid": "dm4", "x": 12, "y": 52, "n": 4, "name": "Módulo de iluminação 4 canais", "code": "MOD-01", "room": "Sala de Estar", "cableType": "eletrica", "mount": "parede", "alt": "baixa"}, {"uid": "dm5", "x": 57, "y": 18, "n": 5, "name": "Keypad 2 teclas", "code": "KP-02", "room": "Cozinha", "cableType": "dados", "mount": "parede", "alt": "media"}, {"uid": "dm6", "x": 60, "y": 40, "n": 6, "name": "Sensor de presença mmW", "code": "SEN-01", "room": "Cozinha", "cableType": "dados", "mount": "teto", "alt": "teto"}, {"uid": "dm7", "x": 52, "y": 50, "n": 7, "name": "Caixa de som embutida", "code": "SP-03", "room": "Cozinha", "cableType": "som", "mount": "teto", "alt": "teto"}, {"uid": "dm8", "x": 88, "y": 15, "n": 8, "name": "Câmera externa 4MP", "code": "CAM-01", "room": "Varanda", "cableType": "dados", "mount": "parede", "alt": "alta"}, {"uid": "dm9", "x": 92, "y": 48, "n": 9, "name": "Câmera externa 4MP", "code": "CAM-02", "room": "Varanda", "cableType": "dados", "mount": "parede", "alt": "alta"}, {"uid": "dm10", "x": 80, "y": 30, "n": 10, "name": "Access Point Wi-Fi 6", "code": "AP-01", "room": "Varanda", "cableType": "dados", "mount": "teto", "alt": "teto"}, {"uid": "dm11", "x": 20, "y": 72, "n": 11, "name": "Keypad 4 teclas", "code": "KP-03", "room": "Suíte Master", "cableType": "dados", "mount": "parede", "alt": "media"}, {"uid": "dm12", "x": 14, "y": 85, "n": 12, "name": "Módulo de cortina", "code": "COR-01", "room": "Suíte Master", "cableType": "eletrica", "mount": "parede", "alt": "alta"}, {"uid": "dm13", "x": 32, "y": 80, "n": 13, "name": "Caixa de som embutida", "code": "SP-04", "room": "Suíte Master", "cableType": "som", "mount": "teto", "alt": "teto"}, {"uid": "dm14", "x": 88, "y": 72, "n": 14, "name": "Keypad 2 teclas", "code": "KP-04", "room": "Suíte 2", "cableType": "dados", "mount": "parede", "alt": "media"}, {"uid": "dm15", "x": 82, "y": 85, "n": 15, "name": "Módulo de cortina", "code": "COR-02", "room": "Suíte 2", "cableType": "eletrica", "mount": "parede", "alt": "alta"}, {"uid": "dm16", "x": 60, "y": 82, "n": 16, "name": "Quadro de automação QDL", "code": "QDL-01", "room": "Banho", "cableType": "eletrica", "mount": "parede", "alt": "media", "caixaTipo": "4x4"}],
  cables: [{"id": "dc1", "fromUid": "dm1", "toUid": "dm16", "type": "dados", "points": [{"x": 20, "y": 42}, {"x": 60, "y": 82}]}, {"id": "dc2", "fromUid": "dm4", "toUid": "dm16", "type": "eletrica", "points": [{"x": 12, "y": 52}, {"x": 60, "y": 82}]}, {"id": "dc3", "fromUid": "dm2", "toUid": "dm3", "type": "som", "points": [{"x": 16, "y": 25}, {"x": 34, "y": 48}]}],
  scale: null, imgRatio: 0.62, calibSamples: [],
}

// ── Proposta demo ───────────────────────────────────────────────────────────
export const DEMO_PROPOSAL = {
  id: 90101,
  code: 'DEMO-0001',
  client_id: 90001,
  client_name: 'Thiago Andrade',
  client: 'Thiago Andrade',
  description: 'Automação residencial completa — casa Jardim Aurora (projeto de demonstração).',
  status: 'approved',
  floors: FLOORS,
  labor: 9800,
  sale: 46200,
  cost: 27100,
  exec_value: 46200,
  pct: 40,
  created_at: '2026-05-06T14:00:00.000Z',
  planta_data: DEMO_PLANTA,
}

// ── Catálogo demo (pequeno, fictício) ───────────────────────────────────────
export const DEMO_CATALOG = [
  { id: 1, name: 'Keypad 4 teclas', category: 'Automação', sale_price: 890, cost_price: 520, unit: 'un' },
  { id: 2, name: 'Keypad 2 teclas', category: 'Automação', sale_price: 690, cost_price: 400, unit: 'un' },
  { id: 3, name: 'Módulo de iluminação 4 canais', category: 'Automação', sale_price: 1650, cost_price: 980, unit: 'un' },
  { id: 4, name: 'Módulo de cortina', category: 'Automação', sale_price: 1200, cost_price: 720, unit: 'un' },
  { id: 5, name: 'Câmera externa 4MP', category: 'Câmera', sale_price: 780, cost_price: 460, unit: 'un' },
  { id: 6, name: 'Caixa de som embutida', category: 'Som', sale_price: 620, cost_price: 360, unit: 'un' },
  { id: 7, name: 'Access Point Wi-Fi 6', category: 'Rede', sale_price: 1100, cost_price: 650, unit: 'un' },
  { id: 8, name: 'Sensor de presença mmW', category: 'Sensor', sale_price: 540, cost_price: 310, unit: 'un' },
  { id: 9, name: 'Central de automação', category: 'Automação', sale_price: 3200, cost_price: 1900, unit: 'un' },
  { id: 10, name: 'Switch gerenciável 8 portas', category: 'Rede', sale_price: 1400, cost_price: 820, unit: 'un' },
]

// ── Projeto (fase de obra) demo ─────────────────────────────────────────────
export const DEMO_PROJECT = {
  id: 90201,
  proposal_id: 90101,
  client_name: 'Thiago Andrade',
  code: 'DEMO-0001',
  phase: 'obra',
  progress: 45,
  created_at: '2026-05-10T09:00:00.000Z',
}

// ── Financeiro demo (ledger da aba Caixa) ───────────────────────────────────
// Estrutura compatível com CaixaRaro: parcelas com pix/venc/pago, custos marcados.
export const DEMO_LEDGER = {
  '90101': {
    valor_total: '46200,00',
    forma: 'Entrada 40% + 3x no PIX',
    parcelas: [
      { id: 'd1', valor: '18480,00', venc: '2026-05-15', pago: true,  data_pago: '2026-05-15', pix: 'RARO' },
      { id: 'd2', valor: '9240,00',  venc: '2026-06-15', pago: true,  data_pago: '2026-06-16', pix: 'Rogério' },
      { id: 'd3', valor: '9240,00',  venc: '2026-07-15', pago: false, pix: 'RARO' },
      { id: 'd4', valor: '9240,00',  venc: '2026-08-15', pago: false, pix: 'Raphael' },
    ],
    custos: [
      { id: 'c1', desc: 'Cabos e eletrodutos (lote inicial)', valor: '3200,00', tipo: 'adiantamento', pix: 'Raphael', cobrado: false },
      { id: 'c2', desc: 'Keypads e módulos (fornecedor)',     valor: '6800,00', tipo: 'cobrar',       pix: 'RARO',    cobrado: true  },
    ],
  },
}
export const DEMO_EMPRESA = {
  despesas: [
    { id: 'e1', data: '2026-05-20', desc: 'Uber visita técnica (demo)', cat: 'Transporte', valor: '68,00' },
    { id: 'e2', data: '2026-06-02', desc: 'Assinatura software (demo)', cat: 'TI / Software', valor: '149,00' },
  ],
}

export const DEMO_USER = { id: 0, name: 'Parceiro (demonstração)', role: 'demo' }

export function buildDemoData() {
  return {
    clients:   [DEMO_CLIENT],
    proposals: [DEMO_PROPOSAL],
    projects:  [DEMO_PROJECT],
    stock:     DEMO_STOCK,
    catalog:   DEMO_CATALOG,
    admins:    [DEMO_USER],
    suppliers: [],
    tools:     [],
  }
}
