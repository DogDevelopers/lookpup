-- board 글쓰기 폼에서 Cloudinary로 업로드한 이미지 URL을 저장하기 위한 컬럼 추가
alter table public.requests
  add column image_urls text[] not null default '{}';
