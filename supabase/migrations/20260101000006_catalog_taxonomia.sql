-- RARO Home — Taxonomia oficial de categorias e subcategorias
-- Execute CADA BLOCO separadamente no SQL Editor do Supabase se houver erro

-- PASSO 1: Adiciona coluna subcategory ao catálogo
ALTER TABLE catalog ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- PASSO 2: Cria tabela de subcategorias
CREATE TABLE IF NOT EXISTS catalog_subcategories (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  CONSTRAINT catalog_subcategories_unique UNIQUE (category, name)
);

-- PASSO 3: Insere/atualiza categorias principais (uma por vez)
INSERT INTO catalog_categories (name) VALUES ('Segurança') ON CONFLICT (name) DO NOTHING;
INSERT INTO catalog_categories (name) VALUES ('Redes') ON CONFLICT (name) DO NOTHING;
INSERT INTO catalog_categories (name) VALUES ('Sonorização') ON CONFLICT (name) DO NOTHING;
INSERT INTO catalog_categories (name) VALUES ('Gourmet') ON CONFLICT (name) DO NOTHING;
INSERT INTO catalog_categories (name) VALUES ('Automação') ON CONFLICT (name) DO NOTHING;

-- PASSO 4: Remove categorias antigas desnecessárias (opcional)
-- DELETE FROM catalog_categories WHERE name NOT IN ('Segurança','Redes','Sonorização','Gourmet','Automação');

-- PASSO 5: Insere subcategorias (uma por vez para evitar erro de sintaxe)
INSERT INTO catalog_subcategories (category, name) VALUES ('Segurança', 'Câmera IP') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Segurança', 'Central de Alarme') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Segurança', 'Gravador NVR') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Redes', 'Access Point') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Redes', 'Switch') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Redes', 'Keystone') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Redes', 'Patch Panel') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Redes', 'Cabos Cat6') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Redes', 'Patch Cord') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Redes', 'Rack') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Sonorização', 'Amplificador') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Sonorização', 'Caixa de Som') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Sonorização', 'Subwoofer') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Sonorização', 'Receiver') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Sonorização', 'Cabeamento Som') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Gourmet', 'Churrasqueira') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Gourmet', 'Coifa') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Gourmet', 'Móveis') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Gourmet', 'Painel de Led') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Automação', 'Interruptor') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Automação', 'Hub IR') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Automação', 'Módulo Iluminação') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Automação', 'Módulo Cortina') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Automação', 'Tomada') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Automação', 'Sensor mmWave') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Automação', 'Gateway Zigbee') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;
INSERT INTO catalog_subcategories (category, name) VALUES ('Automação', 'Rack') ON CONFLICT ON CONSTRAINT catalog_subcategories_unique DO NOTHING;

-- PASSO 6: Migra subcategorias dos itens existentes
UPDATE catalog SET subcategory =
  CASE
    WHEN LOWER(name) LIKE '%access point%' OR LOWER(name) LIKE '%ap u6%' THEN 'Access Point'
    WHEN LOWER(name) LIKE '%patch panel%'          THEN 'Patch Panel'
    WHEN LOWER(name) LIKE '%patch cord%'            THEN 'Patch Cord'
    WHEN LOWER(name) LIKE '%keystone%'              THEN 'Keystone'
    WHEN LOWER(name) LIKE '%dream machine%' OR LOWER(name) LIKE '%switch poe%' OR LOWER(name) LIKE '%udm%' THEN 'Switch'
    WHEN LOWER(name) LIKE '%cat6%' OR (LOWER(name) LIKE '%cabo%' AND LOWER(name) LIKE '%rede%') THEN 'Cabos Cat6'
    WHEN LOWER(name) LIKE '%câmera%' OR LOWER(name) LIKE '%dome%' OR LOWER(name) LIKE '%bullet%' THEN 'Câmera IP'
    WHEN LOWER(name) LIKE '%nvr%' OR LOWER(name) LIKE '%dvr%' THEN 'Gravador NVR'
    WHEN LOWER(name) LIKE '%alarme%'               THEN 'Central de Alarme'
    WHEN LOWER(name) LIKE '%amplificador%' OR LOWER(name) LIKE '%frahm%' THEN 'Amplificador'
    WHEN LOWER(name) LIKE '%subwoofer%'             THEN 'Subwoofer'
    WHEN LOWER(name) LIKE '%receiver%'              THEN 'Receiver'
    WHEN LOWER(name) LIKE '%caixa%' AND (LOWER(name) LIKE '%jbl%' OR LOWER(name) LIKE '%260%' OR LOWER(name) LIKE '%280%') THEN 'Caixa de Som'
    WHEN LOWER(name) LIKE '%hub ir%' OR LOWER(name) LIKE '%ir zigbee%' THEN 'Hub IR'
    WHEN LOWER(name) LIKE '%keypad%' OR LOWER(name) LIKE '%interruptor%' THEN 'Interruptor'
    WHEN LOWER(name) LIKE '%módulo cortina%' OR LOWER(name) LIKE '%cortina zigbee%' THEN 'Módulo Cortina'
    WHEN LOWER(name) LIKE '%módulo%'               THEN 'Módulo Iluminação'
    WHEN LOWER(name) LIKE '%tomada%'               THEN 'Tomada'
    WHEN LOWER(name) LIKE '%mmwave%' OR (LOWER(name) LIKE '%sensor%' AND LOWER(name) LIKE '%presença%') THEN 'Sensor mmWave'
    WHEN LOWER(name) LIKE '%gateway%'              THEN 'Gateway Zigbee'
    ELSE subcategory
  END
WHERE name IS NOT NULL;

-- PASSO 7: Migra categorias a partir da subcategoria
UPDATE catalog SET category =
  CASE
    WHEN subcategory IN ('Access Point','Switch','Keystone','Patch Panel','Cabos Cat6','Patch Cord','Rack') THEN 'Redes'
    WHEN subcategory IN ('Câmera IP','Gravador NVR','Central de Alarme') THEN 'Segurança'
    WHEN subcategory IN ('Amplificador','Caixa de Som','Subwoofer','Receiver','Cabeamento Som') THEN 'Sonorização'
    WHEN subcategory IN ('Churrasqueira','Coifa','Móveis','Painel de Led') THEN 'Gourmet'
    WHEN subcategory IN ('Interruptor','Hub IR','Módulo Iluminação','Módulo Cortina','Tomada','Sensor mmWave','Gateway Zigbee') THEN 'Automação'
    ELSE COALESCE(category, 'Automação')
  END
WHERE subcategory IS NOT NULL;
