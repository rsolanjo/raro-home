-- v75: Nova taxonomia de categorias e subcategorias RARO Home

-- 1) Adiciona coluna subcategory ao catálogo
alter table catalog add column if not exists subcategory text;

-- 2) Limpa e reinsere as categorias principais
delete from catalog_categories;
insert into catalog_categories (name) values
  ('Segurança / CFTV')
  ('Redes / WiFi')
  ('Som Ambiente')
  ('Gourmet / Lazer')
  ('Automação')
on conflict (name) do nothing;

-- 3) Cria tabela de subcategorias (se não existir)
create table if not exists catalog_subcategories (
  id serial primary key,
  category text not null,
  name text not null,
  unique(category, name)
);
insert into catalog_subcategories (category, name) values
  ('Segurança / CFTV', 'Câmera IP')
  ('Segurança / CFTV', 'Câmera Analógica')
  ('Segurança / CFTV', 'Sensor de Presença')
  ('Segurança / CFTV', 'Central de Alarme')
  ('Segurança / CFTV', 'Gravador NVR/DVR')
  ('Segurança / CFTV', 'Acessório Segurança')
  ('Redes / WiFi', 'Access Point')
  ('Redes / WiFi', 'Switch / Roteador')
  ('Redes / WiFi', 'Keystone / Patch')
  ('Redes / WiFi', 'Cabos Cat6/Cat5')
  ('Redes / WiFi', 'Rack / Enclosure')
  ('Redes / WiFi', 'Acessório Rede')
  ('Som Ambiente', 'Amplificador')
  ('Som Ambiente', 'Caixa de Som')
  ('Som Ambiente', 'Subwoofer')
  ('Som Ambiente', 'Receiver')
  ('Som Ambiente', 'Cabeamento Som')
  ('Som Ambiente', 'Acessório Som')
  ('Gourmet / Lazer', 'Churrasqueira Smart')
  ('Gourmet / Lazer', 'Iluminação Gourmet')
  ('Gourmet / Lazer', 'Cortina / Pergolado')
  ('Gourmet / Lazer', 'TV / Projetor')
  ('Gourmet / Lazer', 'Acessório Gourmet')
  ('Automação', 'Keypad / Interruptor')
  ('Automação', 'Hub IR / Controle AV')
  ('Automação', 'Módulo Iluminação')
  ('Automação', 'Módulo Cortina')
  ('Automação', 'Tomada Inteligente')
  ('Automação', 'Sensor mmWave')
  ('Automação', 'Gateway Zigbee')
  ('Automação', 'Acessório Automação')
on conflict (category, name) do nothing;

-- 4) Auto-migra itens existentes: atualiza category usando mapeamento de nomes
update catalog set subcategory = case
  when lower(name) like '%access point%' then 'Access Point'
  when lower(name) like '%keystone%' then 'Keystone / Patch'
  when lower(name) like '%patch%' then 'Keystone / Patch'
  when lower(name) like '%câmera%' or lower(name) like '%dome%' or lower(name) like '%bullet%' then 'Câmera IP'
  when lower(name) like '%hub ir%' or lower(name) like '%ir zigbee%' then 'Hub IR / Controle AV'
  when lower(name) like '%keypad%' then 'Keypad / Interruptor'
  when lower(name) like '%amplificador%' then 'Amplificador'
  when lower(name) like '%caixa%' and (lower(name) like '%jbl%' or lower(name) like '%som%') then 'Caixa de Som'
  when lower(name) like '%subwoofer%' then 'Subwoofer'
  when lower(name) like '%módulo cortina%' then 'Módulo Cortina'
  when lower(name) like '%módulo%' then 'Módulo Iluminação'
  when lower(name) like '%tomada%' then 'Tomada Inteligente'
  when lower(name) like '%sensor%mmwave%' or lower(name) like '%mmwave%' then 'Sensor mmWave'
  when lower(name) like '%switch%' or lower(name) like '%dream machine%' then 'Switch / Roteador'
  when lower(name) like '%rack%' then 'Rack / Enclosure'
  else null
end;

update catalog set category = case
  when subcategory in ('Access Point','Switch / Roteador','Keystone / Patch','Cabos Cat6/Cat5','Rack / Enclosure') then 'Redes / WiFi'
  when subcategory in ('Câmera IP','Sensor de Presença','Central de Alarme') then 'Segurança / CFTV'
  when subcategory in ('Amplificador','Caixa de Som','Subwoofer','Receiver') then 'Som Ambiente'
  when subcategory in ('Hub IR / Controle AV','Keypad / Interruptor','Módulo Iluminação','Módulo Cortina','Tomada Inteligente','Sensor mmWave','Gateway Zigbee') then 'Automação'
  else coalesce(category, 'Automação')
end
where subcategory is not null;
