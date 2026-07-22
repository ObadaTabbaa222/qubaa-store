-- ============================================================
--  متجر نقاط جامع قباء — مخطط قاعدة البيانات (Supabase / PostgreSQL)
--  شغّل هذا الملف كاملاً في: Supabase Dashboard > SQL Editor
--  ملاحظة: تسجيل الدخول مخصّص (username+password) ويُدار من السيرفر
--  بمفتاح service role، لذلك لا نعتمد على Supabase Auth ولا على RLS هنا.
--
--  لمشروع جديد: شغّل هذا الملف كاملاً كما هو.
--  لتحديث قاعدة بيانات موجودة (فيها بيانات فعلية): انزل إلى قسم
--  "MIGRATION" في نهاية الملف وشغّله بدلاً من القسم الأول (وليس معه).
-- ============================================================

create extension if not exists pgcrypto;

create type admin_role   as enum ('super_admin', 'halaqah_supervisor');
create type order_status as enum ('pending', 'approved', 'delivered', 'cancelled');

create table admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  password_hash text not null,
  role admin_role not null default 'super_admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- صف واحد فقط: مفتاح المتجر (مفتوح/مغلق)
create table settings (
  id boolean primary key default true,
  store_open boolean not null default false,
  check (id)
);
insert into settings (id, store_open) values (true, false);

create table halaqat (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  supervisor_id uuid references admins(id) on delete set null,
  created_at timestamptz not null default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  halaqah_id uuid not null references halaqat(id) on delete cascade,
  full_name text not null,
  username text not null unique,
  password_hash text not null,
  password_plain text, -- نسخة قابلة للقراءة يعرضها الأدمن للطالب (تسجيل الدخول الفعلي يعتمد على password_hash فقط)
  balance integer not null default 0 check (balance >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_students_halaqah on students(halaqah_id);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_points integer not null check (price_points > 0),
  image_url text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  is_unlimited boolean not null default false,
  max_per_student integer check (max_per_student is null or max_per_student > 0),
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  status order_status not null default 'pending',
  total_points integer not null check (total_points >= 0),
  note text,
  created_at timestamptz not null default now()
);
create index idx_orders_student on orders(student_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_points integer not null check (unit_price_points > 0),
  line_total integer not null check (line_total > 0)
);
create index idx_order_items_order on order_items(order_id);

-- ---------- إتمام الطلب (atomic) ----------
create or replace function place_order(
  p_student_id uuid, p_items jsonb, p_note text default null
) returns uuid language plpgsql as $$
declare
  v_order_id uuid; v_total int := 0; v_balance int; v_open boolean;
  v_item jsonb; v_product products%rowtype; v_qty int; v_line int; v_already int;
begin
  select store_open into v_open from settings where id;
  if not coalesce(v_open, false) then raise exception 'المتجر مغلق حالياً'; end if;

  select balance into v_balance from students where id = p_student_id and is_active for update;
  if v_balance is null then raise exception 'الطالب غير موجود أو غير مفعّل'; end if;

  insert into orders (student_id, total_points, note)
  values (p_student_id, 0, p_note) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'كمية غير صالحة'; end if;

    select * into v_product from products
     where id = (v_item->>'product_id')::uuid and is_active for update;
    if v_product.id is null then raise exception 'المنتج غير متاح'; end if;

    if not v_product.is_unlimited and v_product.stock_quantity < v_qty then
      raise exception 'الكمية المطلوبة من "%" غير متوفرة', v_product.name;
    end if;

    if v_product.max_per_student is not null then
      select coalesce(sum(oi.quantity), 0) into v_already
        from order_items oi
        join orders o on o.id = oi.order_id
       where oi.product_id = v_product.id
         and o.student_id = p_student_id
         and o.status <> 'cancelled';
      if v_already + v_qty > v_product.max_per_student then
        if v_product.max_per_student = 1 then
          raise exception 'لا يمكنك طلب "%" أكثر من مرة', v_product.name;
        else
          raise exception 'لا يمكنك طلب "%" أكثر من % مرة', v_product.name, v_product.max_per_student;
        end if;
      end if;
    end if;

    v_line := v_product.price_points * v_qty;
    v_total := v_total + v_line;
    insert into order_items (order_id, product_id, quantity, unit_price_points, line_total)
    values (v_order_id, v_product.id, v_qty, v_product.price_points, v_line);

    if not v_product.is_unlimited then
      update products set stock_quantity = stock_quantity - v_qty where id = v_product.id;
    end if;
  end loop;

  if v_total = 0 then raise exception 'الطلب فارغ'; end if;
  if v_balance < v_total then raise exception 'الرصيد غير كافٍ'; end if;

  update students set balance = balance - v_total where id = p_student_id;
  update orders set total_points = v_total where id = v_order_id;

  return v_order_id;
end; $$;

-- ---------- إلغاء طلب (إرجاع النقاط والمخزون) ----------
create or replace function cancel_order(p_order_id uuid)
returns void language plpgsql as $$
declare v_order orders%rowtype; v_item record;
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'الطلب غير موجود'; end if;
  if v_order.status = 'cancelled' then return; end if;
  for v_item in
    select oi.product_id, oi.quantity, p.is_unlimited
      from order_items oi
      join products p on p.id = oi.product_id
     where oi.order_id = p_order_id
  loop
    if not v_item.is_unlimited then
      update products set stock_quantity = stock_quantity + v_item.quantity where id = v_item.product_id;
    end if;
  end loop;
  update students set balance = balance + v_order.total_points where id = v_order.student_id;
  update orders set status = 'cancelled' where id = p_order_id;
end; $$;

-- ---------- تقرير الطلبات (على مستوى المتجر كاملاً، بدون جولات) ----------
create or replace view order_report as
select o.id as order_id, o.status, o.created_at,
       p.id as product_id, p.name as product_name,
       s.id as student_id, s.full_name as student_name, s.balance as student_balance,
       h.id as halaqah_id, h.name as halaqah_name,
       oi.quantity, oi.unit_price_points, oi.line_total
from order_items oi
join orders o    on o.id = oi.order_id
join products p  on p.id = oi.product_id
join students s  on s.id = o.student_id
join halaqat h   on h.id = s.halaqah_id
where o.status <> 'cancelled'
order by h.name, s.full_name, p.name;

-- ---------- Supabase Storage: مخزن صور المنتجات ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;


-- ============================================================
--  MIGRATION — لتحديث قاعدة بيانات موجودة فيها بيانات فعلية
--  شغّل هذا القسم فقط (بدل القسم أعلاه) إذا كان المشروع يعمل مسبقاً.
--  يحافظ على كل الطلاب والحلقات والمنتجات وسجل الطلبات القديم.
-- ============================================================
/*

-- 1) جدول الإعدادات (مفتاح المتجر)
create table if not exists settings (
  id boolean primary key default true,
  store_open boolean not null default false,
  check (id)
);
insert into settings (id, store_open) values (true, false) on conflict (id) do nothing;

-- 2) حذف الجولات، مع الإبقاء على سجل الطلبات القديم
alter table orders drop constraint if exists orders_campaign_id_fkey;
drop index if exists idx_orders_campaign;
alter table orders drop column if exists campaign_id;
drop view if exists campaign_order_report;
drop table if exists campaigns cascade;

-- 3) حذف سجل النقاط (الرصيد أصبح رقماً يُعدَّل يدوياً فقط)
drop function if exists award_points(uuid, integer, text, uuid);
drop function if exists award_points_halaqah(uuid, integer, text, uuid);
drop table if exists point_transactions cascade;
drop type if exists txn_type;

-- 4) حذف نهائي متسلسل (Cascade) عند حذف حلقة أو طالب
alter table students drop constraint if exists students_halaqah_id_fkey;
alter table students add constraint students_halaqah_id_fkey
  foreign key (halaqah_id) references halaqat(id) on delete cascade;

alter table orders drop constraint if exists orders_student_id_fkey;
alter table orders add constraint orders_student_id_fkey
  foreign key (student_id) references students(id) on delete cascade;

-- 5) دالتا الطلب والإلغاء المحدّثتان (بدون جولات، بدون سجل نقاط)
create or replace function place_order(
  p_student_id uuid, p_items jsonb, p_note text default null
) returns uuid language plpgsql as $$
declare
  v_order_id uuid; v_total int := 0; v_balance int; v_open boolean;
  v_item jsonb; v_product products%rowtype; v_qty int; v_line int;
begin
  select store_open into v_open from settings where id;
  if not coalesce(v_open, false) then raise exception 'المتجر مغلق حالياً'; end if;

  select balance into v_balance from students where id = p_student_id and is_active for update;
  if v_balance is null then raise exception 'الطالب غير موجود أو غير مفعّل'; end if;

  insert into orders (student_id, total_points, note)
  values (p_student_id, 0, p_note) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'كمية غير صالحة'; end if;

    select * into v_product from products
     where id = (v_item->>'product_id')::uuid and is_active for update;
    if v_product.id is null then raise exception 'المنتج غير متاح'; end if;
    if v_product.stock_quantity < v_qty then
      raise exception 'الكمية المطلوبة من "%" غير متوفرة', v_product.name;
    end if;

    v_line := v_product.price_points * v_qty;
    v_total := v_total + v_line;
    insert into order_items (order_id, product_id, quantity, unit_price_points, line_total)
    values (v_order_id, v_product.id, v_qty, v_product.price_points, v_line);
    update products set stock_quantity = stock_quantity - v_qty where id = v_product.id;
  end loop;

  if v_total = 0 then raise exception 'الطلب فارغ'; end if;
  if v_balance < v_total then raise exception 'الرصيد غير كافٍ'; end if;

  update students set balance = balance - v_total where id = p_student_id;
  update orders set total_points = v_total where id = v_order_id;

  return v_order_id;
end; $$;

create or replace function cancel_order(p_order_id uuid)
returns void language plpgsql as $$
declare v_order orders%rowtype; v_item order_items%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'الطلب غير موجود'; end if;
  if v_order.status = 'cancelled' then return; end if;
  for v_item in select * from order_items where order_id = p_order_id loop
    update products set stock_quantity = stock_quantity + v_item.quantity where id = v_item.product_id;
  end loop;
  update students set balance = balance + v_order.total_points where id = v_order.student_id;
  update orders set status = 'cancelled' where id = p_order_id;
end; $$;

-- 6) تقرير الطلبات على مستوى المتجر كاملاً
create or replace view order_report as
select o.id as order_id, o.status, o.created_at,
       p.id as product_id, p.name as product_name,
       s.id as student_id, s.full_name as student_name, s.balance as student_balance,
       h.id as halaqah_id, h.name as halaqah_name,
       oi.quantity, oi.unit_price_points, oi.line_total
from order_items oi
join orders o    on o.id = oi.order_id
join products p  on p.id = oi.product_id
join students s  on s.id = o.student_id
join halaqat h   on h.id = s.halaqah_id
where o.status <> 'cancelled'
order by h.name, s.full_name, p.name;

-- 7) مخزن صور المنتجات في Supabase Storage
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 8) كلمة سر قابلة للقراءة (يعرضها الأدمن للطالب) — الطلاب الحاليون تبقى هذه الخانة فارغة لهم
alter table students add column if not exists password_plain text;

*/

-- ============================================================
--  MIGRATION 2 — إخفاء المخزون عن الطلاب + منتجات غير محدودة
--               + حدّ أقصى للطلب لكل طالب
--  شغّل هذا القسم على قاعدة البيانات الحيّة (Supabase SQL Editor).
--  آمن للتشغيل المتكرر (idempotent) باستثناء سطر إضافة الـ constraint
--  (شغّله مرة واحدة فقط — إن ظهر خطأ "already exists" تجاهله).
-- ============================================================

-- 1) أعمدة جديدة على المنتجات
alter table products add column if not exists is_unlimited boolean not null default false;
alter table products add column if not exists max_per_student integer;
alter table products add constraint products_max_per_student_check
  check (max_per_student is null or max_per_student > 0);

-- 2) place_order: تجاهل فحص/خصم المخزون للمنتجات غير المحدودة،
--    وفرض الحد الأقصى لكل طالب (بما يشمل عدة قطع من نفس المنتج ضمن نفس الطلب)
create or replace function place_order(
  p_student_id uuid, p_items jsonb, p_note text default null
) returns uuid language plpgsql as $$
declare
  v_order_id uuid; v_total int := 0; v_balance int; v_open boolean;
  v_item jsonb; v_product products%rowtype; v_qty int; v_line int; v_already int;
begin
  select store_open into v_open from settings where id;
  if not coalesce(v_open, false) then raise exception 'المتجر مغلق حالياً'; end if;

  select balance into v_balance from students where id = p_student_id and is_active for update;
  if v_balance is null then raise exception 'الطالب غير موجود أو غير مفعّل'; end if;

  insert into orders (student_id, total_points, note)
  values (p_student_id, 0, p_note) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'كمية غير صالحة'; end if;

    select * into v_product from products
     where id = (v_item->>'product_id')::uuid and is_active for update;
    if v_product.id is null then raise exception 'المنتج غير متاح'; end if;

    if not v_product.is_unlimited and v_product.stock_quantity < v_qty then
      raise exception 'الكمية المطلوبة من "%" غير متوفرة', v_product.name;
    end if;

    if v_product.max_per_student is not null then
      select coalesce(sum(oi.quantity), 0) into v_already
        from order_items oi
        join orders o on o.id = oi.order_id
       where oi.product_id = v_product.id
         and o.student_id = p_student_id
         and o.status <> 'cancelled';
      if v_already + v_qty > v_product.max_per_student then
        if v_product.max_per_student = 1 then
          raise exception 'لا يمكنك طلب "%" أكثر من مرة', v_product.name;
        else
          raise exception 'لا يمكنك طلب "%" أكثر من % مرة', v_product.name, v_product.max_per_student;
        end if;
      end if;
    end if;

    v_line := v_product.price_points * v_qty;
    v_total := v_total + v_line;
    insert into order_items (order_id, product_id, quantity, unit_price_points, line_total)
    values (v_order_id, v_product.id, v_qty, v_product.price_points, v_line);

    if not v_product.is_unlimited then
      update products set stock_quantity = stock_quantity - v_qty where id = v_product.id;
    end if;
  end loop;

  if v_total = 0 then raise exception 'الطلب فارغ'; end if;
  if v_balance < v_total then raise exception 'الرصيد غير كافٍ'; end if;

  update students set balance = balance - v_total where id = p_student_id;
  update orders set total_points = v_total where id = v_order_id;

  return v_order_id;
end; $$;

-- 3) cancel_order: لا تُعاد المخزون للمنتجات غير المحدودة
create or replace function cancel_order(p_order_id uuid)
returns void language plpgsql as $$
declare v_order orders%rowtype; v_item record;
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'الطلب غير موجود'; end if;
  if v_order.status = 'cancelled' then return; end if;
  for v_item in
    select oi.product_id, oi.quantity, p.is_unlimited
      from order_items oi
      join products p on p.id = oi.product_id
     where oi.order_id = p_order_id
  loop
    if not v_item.is_unlimited then
      update products set stock_quantity = stock_quantity + v_item.quantity where id = v_item.product_id;
    end if;
  end loop;
  update students set balance = balance + v_order.total_points where id = v_order.student_id;
  update orders set status = 'cancelled' where id = p_order_id;
end; $$;
