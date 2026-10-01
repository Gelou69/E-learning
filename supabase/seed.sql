-- =====================================================================
--  VGD E-Learning Hub — demo data seed
--  Run AFTER supabase/schema.sql in the Supabase SQL Editor.
--
--  Creates the auth users (so you can log in immediately) and populates
--  content + sample student responses so every report has data.
--
--  Login accounts (passwords match the buttons on the login screen):
--    maria.delacruz@student.vgd.edu.ph / student123
--    villanueva@vgd.edu.ph             / teacher123
--    sammymalik@admin.edu.ph           / admin123
--  The 24 other students also use student123.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. helper: create an auth user + matching profile if it does not exist
-- ---------------------------------------------------------------------
create or replace function public.__seed_user(
  p_email     text,
  p_password  text,
  p_full_name text,
  p_role      text,
  p_section   text default null,
  p_student_no text default null,
  p_gender    text default null,
  p_color     text default '#0f766e'
)
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;

  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
              created_at, updated_at, confirmation_token, email_change,
              email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000',
            v_id, 'authenticated', 'authenticated',
            p_email, crypt(p_password, gen_salt('bf')),
            now(),
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', p_role),
            jsonb_build_object('full_name', p_full_name, 'role', p_role,
                               'section', p_section, 'student_no', p_student_no,
                               'avatar_color', p_color),
          now(), now(), '', '', '', '');
  end if;

  insert into public.profiles (id, email, full_name, role, section, student_no, gender, avatar_color)
  values (v_id, p_email, p_full_name, p_role, p_section, p_student_no, p_gender, p_color)
  on conflict (id) do update
    set email        = excluded.email,
        full_name    = excluded.full_name,
        role         = excluded.role,
        section      = coalesce(excluded.section, public.profiles.section),
        student_no   = coalesce(excluded.student_no, public.profiles.student_no),
        gender       = coalesce(excluded.gender, public.profiles.gender),
        avatar_color = excluded.avatar_color;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. staff
-- ---------------------------------------------------------------------
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
   email_change = coalesce(email_change, ''),
   email_change_token_new = coalesce(email_change_token_new, ''),
   recovery_token = coalesce(recovery_token, '')
where confirmation_token is null
  or email_change is null
  or email_change_token_new is null
  or recovery_token is null;

update auth.users
set email = 'sammymalik@admin.edu.ph',
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'Sammy Malik')
where email = 'domingo@admin.vgd.edu.ph'
  and not exists (select 1 from auth.users where email = 'sammymalik@admin.edu.ph');

update public.profiles
set email = 'sammymalik@admin.edu.ph', full_name = 'Sammy Malik'
where email = 'domingo@admin.vgd.edu.ph'
  and not exists (select 1 from public.profiles where email = 'sammymalik@admin.edu.ph');

select public.__seed_user('sammymalik@admin.edu.ph', 'admin123',
                         'Sammy Malik', 'admin', null, null, null, '#7c3aed');
select public.__seed_user('villanueva@vgd.edu.ph', 'teacher123',
                         'Engr. Bea Villanueva', 'teacher', null, null, null, '#0f766e');
select public.__seed_user('navarro@vgd.edu.ph', 'teacher123',
                         'Mr. Rico Navarro', 'teacher', null, null, null, '#b45309');

-- ---------------------------------------------------------------------
-- 3. the class — 25 students across three sections
-- ---------------------------------------------------------------------
do $$
declare
  v_names  text[] := array [
    'maria.delacruz','jomar.santos','kyla.reyes','diego.bautista','angel.garcia',
    'prince.mendoza','nicole.torres','paolo.aquino','grace.ramos','marco.cruz',
    'camille.villanueva','rico.padilla','jasmine.domingo','noel.navarro','tara.salazar',
    'luis.ocampo','bea.delacruz','ethan.santos','sofia.reyes','nico.bautista',
    'alma.garcia','gab.mendoza','rhea.torres','carlo.aquino','mika.ramos'
  ];
  v_colors text[] := array ['#0f766e','#b45309','#7c3aed','#be123c','#0369a1','#15803d'];
  v_full   text;
  i int;
begin
  for i in 1..array_length(v_names, 1) loop
    v_full := initcap(replace(v_names[i], '.', ' '));
    perform public.__seed_user(
      v_names[i] || '@student.vgd.edu.ph',
      'student123',
      v_full,
      'student',
      'VGD 11 - Section ' || chr(65 + ((i - 1) % 3)),
      '2026-' || (1000 + i),
      case when i % 2 = 0 then 'Female' else 'Male' end,
      v_colors[1 + ((i - 1) % 6)]
    );
  end loop;
end $$;

drop function if exists public.__seed_user(text, text, text, text, text, text, text, text);

-- ---------------------------------------------------------------------
-- 4. content: plates
-- ---------------------------------------------------------------------
insert into public.plates (id, title, topic, difficulty, sdgs, quarter, scale, description, featured)
values
  ('plate-01', 'ISO Technical Lettering Plate',    'Technical Lettering',        'Beginner',     '{4,12}',  'q1', '1:1',  'Standard 7 mm technical lettering grid with letterforms A–Z and numerals 0–9.', true),
  ('plate-02', 'Line Types and Line Weight Study', 'Line Types & Line Weight',   'Beginner',     '{4,9}',   'q1', 'NTS',  'Continuous, dashed, centre and hidden lines drawn at five weights.', true),
  ('plate-03', 'Isometric Box in 30° Axes',        'Isometric Projection',       'Beginner',     '{9,11}',  'q1', 'NTS',  'Box a rectangular prism on a 30° isometric grid with construction lines shown.', false),
  ('plate-04', 'First Angle Orthographic Set',     'Orthographic Projection',    'Intermediate', '{9,11}',  'q2', '1:2',  'Front, top and right-side views in first-angle arrangement.', true),
  ('plate-05', 'Cylindrical Object Dimensioning', 'Dimensioning & Annotation',  'Intermediate', '{9,12}',  'q2', '1:1',  'Dimension a stepped cylinder using diameter, radius and chain dimensions.', false),
  ('plate-06', 'Sectional View of a Bracket',     'Sectional Views',            'Intermediate', '{9,13}',  'q2', '1:2',  'Full section through a bracket, hatching at 45° with fasteners left clear.', true),
  ('plate-07', 'Freehand Perspective: One-Point', 'Perspective Drawing',        'Intermediate', '{11,13}', 'q3', 'NTS',  'One-point perspective interior of a small workshop interior.', false),
  ('plate-08', 'Shaded Perspective Cube Study',   'Rendering & Shading',        'Intermediate', '{12,13}', 'q3', 'NTS',  'Value range study: cast shadow, form shadow and reflected light.', true),
  ('plate-09', 'Colour Wheel and Value Scale',    'Colour Theory',               'Beginner',     '{12,15}', 'q3', 'NTS',  'Twelve-part colour wheel with tint, shade and neutral value scale.', false),
  ('plate-10', 'Simple Logo Grid Construction',   'Technical Lettering',        'Intermediate', '{9,12}',  'q3', 'NTS',  'Geometric grid for a sustainable-agriculture mark, ready for rendering.', true),
  ('plate-11', 'Digital Blueprint: Floor Plan',   'CAD Drafting',                'Advanced',     '{9,11}',  'q4', '1:50', 'Line conventions for a digital blueprint floor plan with title block.', false),
  ('plate-12', 'Sustainable Product Concept Sheet','Design Process',             'Advanced',     '{12,13}', 'q4', 'NTS',  'Concept development sheet linking SDG 12 targets to a product idea.', true),
  ('plate-13', 'Isometric Assembly Exploded View','Isometric Projection',       'Advanced',     '{9,13}',  'q4', 'NTS',  'Exploded isometric assembly with balloon callouts and a parts list.', false),
  ('plate-14', 'Photorealistic Packaging Mock-up','Rendering & Shading',        'Advanced',     '{12,15}', 'q4', 'NTS',  'Two-point perspective packaging render with sustainable material notes.', true)
on conflict (id) do update
  set title = excluded.title, topic = excluded.topic, difficulty = excluded.difficulty,
      sdgs = excluded.sdgs, quarter = excluded.quarter, scale = excluded.scale,
      description = excluded.description, featured = excluded.featured;

-- ---------------------------------------------------------------------
-- 5. content: videos with their activity tasks
-- ---------------------------------------------------------------------
insert into public.videos (id, title, topic, quarter, sdgs, duration, level, video_id, summary, tasks)
values
  ('vid-01', 'Sketching: Freehand Line Quality in 12 Minutes', 'Line Types & Line Weight', 'q1', '{4,9}',    '12:04', 'Beginner',     'MsXW_fErGBg', 'Warm-up drills for a steady hand, pen pressure control, and how to correct a wobbly line without redrawing it.',
   '[{"id":"t1","title":"Continuous line drill","detail":"Draw 20 straight lines that start and end on your construction marks. Aim for under 1 mm deviation."},{"id":"t2","title":"Weight ladder","detail":"Draw the same square five times at 0.25, 0.5, 0.7, 1.0 and 1.4 mm equivalent weights."},{"id":"t3","title":"Hidden detail drill","detail":"Redraw Plate 02 with the hidden recess shown in a 0.35 mm dashed line."}]'),
  ('vid-02', 'Isometric Projection Fundamentals',            'Isometric Projection',     'q1', '{9,11}',   '18:32', 'Beginner',     'nzgCmzXonj0', 'Building isometric axes, transferring dimensions, and boxing a solid without a template.',
   '[{"id":"t1","title":"Axis construction","detail":"Draw the 30° axes full sheet length and mark every 10 mm division."},{"id":"t2","title":"Box transfer","detail":"Box a 400 x 300 x 250 solid using only the axes, with no ruler measurement."}]'),
  ('vid-03', 'Orthographic Projection: First vs Third Angle', 'Orthographic Projection',  'q2', '{9,11}',   '21:05', 'Intermediate', 'e-j_zs4pHX8', 'Why the truncated cone sits opposite in the two conventions, and how to read a multiview layout.',
   '[{"id":"t1","title":"Convention test","detail":"Sketch the same object in both conventions and label the truncated cone position."},{"id":"t2","title":"Missing view","detail":"Given two views, construct the third and add every necessary centre line."}]'),
  ('vid-04', 'Dimensioning and Annotation Rules',            'Dimensioning & Annotation','q2', '{9,12}',   '16:48', 'Intermediate', 'nAXoQoWYVjY', 'Chain, baseline and grouped dimensioning, and which dimensions never get repeated.',
   '[{"id":"t1","title":"Redundant dimension hunt","detail":"Find and remove every redundant dimension on Plate 05, then explain each removal."}]'),
  ('vid-05', 'Rendering: Value and Light Source',             'Rendering & Shading',      'q3', '{12,13}',  '24:17', 'Intermediate', 'VKO00lZ5c-4', 'Choosing a light source, building five values, and rendering reflective and transparent surfaces.',
   '[{"id":"t1","title":"Value scale","detail":"Render a sphere with a full five-step value scale from paper white to darkest shadow."},{"id":"t2","title":"Cast shadow","detail":"Place a single consistent light source and render the cast shadow on a simple block."}]'),
  ('vid-06', 'Sustainable Design Brief Walkthrough',         'Design Process',           'q4', '{12,13}',  '19:50', 'Advanced',     'tyij73f10yg', 'Reading a design brief, defining constraints, and iterating from thumbnail to final render.',
   '[{"id":"t1","title":"Constraint map","detail":"List four constraints from SDG targets 12.3 and 13.2 that your concept must satisfy."},{"id":"t2","title":"Iteration record","detail":"Submit three thumbnails with a one-line justification for each design decision."}]')
on conflict (id) do update
  set title = excluded.title, topic = excluded.topic, quarter = excluded.quarter,
      sdgs = excluded.sdgs, duration = excluded.duration, level = excluded.level,
      video_id = excluded.video_id, summary = excluded.summary, tasks = excluded.tasks;

-- ---------------------------------------------------------------------
-- 6. content: lessons
--     `generated = true` means the PDF is rendered in-app from the sections
--     array; upload a real file and clear the flag to replace it.
-- ---------------------------------------------------------------------
insert into public.lessons (id, title, topic, quarter, sdgs, pages, size_kb, summary, published, generated, sections)
values
  ('pdf-01', 'Lesson 1 — Technical Lettering Standards', 'Technical Lettering', 'q1', '{4,12}', 12,  640,
   'Letter height, spacing, and the alignment rules used across the technical drawing module.', true, true,
   '[{"heading":"Why lettering matters","body":["Technical lettering carries dimensions that words cannot: a drawing that is accurate but poorly lettered is still hard to read on site.","Set letter height to 3.5 mm on A3 sheets and 2.5 mm on A4 so the printed text stays legible.","Keep a minimum gap of one stroke width between characters."]},
     {"heading":"Letter proportions","body":["A single stroke of width 1 is the reference unit. Height is 7 units, width about 5 units, and most lowercase letters 5 units."],"bullets":["Use 1:2 pencil to 1:5 pen for construction, then ink the final stroke.","Capitals only for the first word and proper nouns.","Never stretch a letter to fill a gap; adjust spacing instead."]},
     {"heading":"Spacing rules","body":["Spaces between letters vary with shape: round-to-round gets more space than straight-to-straight.","Align letter baselines exactly; capital and lowercase share one baseline."]}]'),

  ('pdf-02', 'Lesson 2 — Line Types and Line Weight', 'Line Types & Line Weight', 'q1', '{4,9}', 14, 720,
   'Continuous, dashed, centre and hidden lines, and when each weight applies.', true, true,
   '[{"heading":"The four line types","body":[],"bullets":["Continuous thick — visible outlines and cutting planes.","Continuous thin — dimension lines, leaders, hatching borders.","Dashed thin — hidden edges behind the visible surface.","Centre thin — axes, centres of circles and symmetry."]},
     {"heading":"Weight order","body":["Use four weights in a fixed order so overlapping lines read correctly: 1.0, 0.7, 0.5, 0.35 mm."],"bullets":["Heaviest line wins at every intersection.","Hidden lines stop short of the visible outline."]},
     {"heading":"Common errors","body":["Using equal weight for every line flattens the drawing and hides the form.","Dash lengths must be consistent; a 3:1 dash-to-gap ratio works at most scales."]}]'),

  ('pdf-03', 'Lesson 3 — Isometric Projection (30° Axes)', 'Isometric Projection', 'q1', '{9,11}', 16, 880,
   'Axis construction, dimension transfer and boxing procedures with worked examples.', true, true,
   '[{"heading":"Axis construction","body":["Draw the two 30° axes to the full sheet length first, then the vertical axis at 90°.","Divide each axis into equal parts, then carry divisions across with a compass or template."]},
     {"heading":"Transferring dimensions","body":["Measure real dimensions on the isometric axes, never on the paper.","A circle in isometric is an ellipse; the minor axis lies on the 30° axis at roughly 0.58 of the major."],"bullets":["Draw construction lines light, then ink the visible edges.","Box the solid before adding any detail."]},
     {"heading":"Common errors","body":["Measuring on the drawing instead of along the axis distorts every dimension.","Losing the 30° angle makes the whole solid look wrong even when the proportions are correct."]}]'),

  ('pdf-04', 'Lesson 4 — Orthographic Projection Conventions', 'Orthographic Projection', 'q2', '{9,11}', 18, 940,
   'First angle and third angle layouts, projection symbols, and view arrangement rules.', true, true,
   '[{"heading":"The two conventions","body":["First angle places the view on the far side of the object; third angle places it on the near side.","Philippines follows first angle for technical drawing, matching ISO and most DepEd modules."]},
     {"heading":"View arrangement","body":["Front view is the reference. Top goes below it in first angle; the right-side view goes on the left."],"bullets":["A truncated cone sits with its small end nearest the front view in first angle.","Always mark the projection symbol in the title block."]},
     {"heading":"Constructing a missing view","body":["Project from the two given views using 45° mitre lines, then check the third view against the isometric."]}]'),

  ('pdf-05', 'Lesson 5 — Dimensioning and Annotation', 'Dimensioning & Annotation', 'q2', '{9,12}', 15, 780,
   'Which dimension to place, which to omit, and how leaders, arrows and notes are drawn.', true, true,
   '[{"heading":"Dimension a feature, not a process","body":["Place the dimension that a machinist needs to cut the feature. Dimensioning to a calculated value is redundant.","Chain dimensions suit short repeated features; baseline dimensions suit evenly spaced ones."]},
     {"heading":"Diameter and radius","body":["Use the diameter symbol for circles and arcs; use R for radii of arcs.","Place diameters through the centre where the view allows it."]},
     {"heading":"Notes and leaders","body":["A leader points to the feature at an angle, never horizontal or vertical.","Place a note once per feature; repeating it clutters the view."]}]'),

  ('pdf-06', 'Lesson 6 — Sectional Views and Hatching', 'Sectional Views', 'q2', '{9,13}', 17, 910,
   'Full, half and offset sections, hatch angles, and the fasteners that stay unhatched.', true, true,
   '[{"heading":"Full section","body":["Pass the cutting plane completely through the part and remove the near half.","Draw the cutting plane line as a thick chain line with arrows showing the viewing direction."]},
     {"heading":"Hatching","body":["Hatch adjacent parts at different angles, normally 45°, so each part reads separately."],"bullets":["Never hatch fasteners, shafts, ribs, or thin webs in a longitudinal section.","Keep hatch spacing even and identical within one part."]},
     {"heading":"Half and offset sections","body":["A half section combines an exterior view and a sectional view, useful for symmetric parts.","Offset sections jog the cutting plane to pass through features that do not line up."]}]'),

  ('pdf-07', 'Lesson 7 — Freehand Perspective', 'Perspective Drawing', 'q3', '{11,13}', 16, 860,
   'One-, two- and three-point perspective with measured construction methods.', true, true,
   '[{"heading":"One-point perspective","body":["All receding lines meet at one vanishing point on the horizon.","Keep verticals vertical; only depth lines converge."]},
     {"heading":"Two-point perspective","body":["Two vanishing points sit on the horizon at the corners of the object.","The horizon height equals the viewer eye level."]},
     {"heading":"Measured perspective","body":["Use the measuring point method to set out consistent proportions across a series of views."]}]'),

  ('pdf-08', 'Lesson 8 — Rendering and Value', 'Rendering & Shading', 'q3', '{12,13}', 20, 1150,
   'Shading techniques, light sources, and building a convincing value range.', true, true,
   '[{"heading":"Light source discipline","body":["Pick one light source and apply it consistently to every surface in the composition.","Cast shadow always falls opposite the light; form shadow hugs the turning edge."]},
     {"heading":"Building a value scale","body":["Make a five-step scale from paper white to your darkest ink before starting.","Squint to check the range; if the light and dark do not separate, redraw the darkest."]},
     {"heading":"Material rendering","body":["Metal keeps a sharp highlight; matte surfaces spread it; transparent surfaces show a compressed value range with a bright core."]}]'),

  ('pdf-09', 'Lesson 9 — Colour Theory for Technical Work', 'Colour Theory', 'q3', '{12,15}', 13, 700,
   'Hue, saturation and value applied to technical drawing and sustainable product palettes.', true, true,
   '[{"heading":"Hue, saturation, value","body":["Hue names the colour, saturation describes intensity, and value describes lightness.","Most technical work stays low-saturation so linework stays dominant."]},
     {"heading":"Sustainable palettes","body":["Derive palettes from natural materials: recycled kraft, reclaimed timber, undyed cotton, algae-based pigments."],"bullets":["Limit renders to three hues plus neutrals.","Use value contrast, not colour contrast, to separate planes."]},
     {"heading":"Colour and accessibility","body":["Never encode information by hue alone; pair colour with weight, pattern or a label."]}]'),

  ('pdf-10', 'Lesson 10 — CAD Drafting Conventions', 'CAD Drafting', 'q4', '{9,11}', 19, 1020,
   'Layer standards, line types in CAD, and preparing a drawing for plot.', true, true,
   '[{"heading":"Layer discipline","body":["Group layers by function: object, dimension, annotation, construction, and hidden.","Set lineweight per layer, not per object, so changes propagate."]},
     {"heading":"Line types","body":["Assign linetype by scale so a dash stays visually consistent when you zoom or plot."]},
     {"heading":"Plot preparation","body":["Freeze or switch off annotation layers before plotting.","Check that the title block sits inside the printable area."]}]'),

  ('pdf-11', 'Lesson 11 — Design Process and Portfolio', 'Design Process', 'q4', '{12,13}', 22, 1240,
   'Brief analysis, thumbnail iteration, and assembling a portfolio that shows process.', true, true,
   '[{"heading":"Reading a brief","body":["Extract the function, the user, the constraints, and the constraint that cannot move."]},
     {"heading":"Thumbnailing","body":["Produce at least six thumbnails before committing. Iterate one variable at a time so you know what changed the result."]},
     {"heading":"Portfolio assembly","body":["Show the process, not only the final render. Include the rejected option and why you rejected it."],"bullets":["One page per project with a consistent template.","Label each plate with quarter, topic, and SDG target."]}]'),

  ('pdf-12', 'Lesson 12 — SDG-Aligned Product Design', 'Design Process', 'q4', '{12,13}', 20, 1100,
   'Linking SDG 12, 13 and 15 targets to concrete design decisions and materials.', true, true,
   '[{"heading":"Target 12.3 — food waste","body":["Design reduces waste at the point of consumption: reusable, portionable, or clearly dated packaging."]},
     {"heading":"Target 12.4 — chemicals and plastics","body":["Prefer mono-material constructions that a local recycler actually accepts."]},
     {"heading":"Target 13.2 — climate policy","body":["Reduce embodied carbon through low-process materials and short supply chains."]},
     {"heading":"Target 15.9 — land and biodiversity","body":["Source certified fibre and avoid designs that depend on endangered species."]},
     {"heading":"Documenting the link","body":["Every SDG claim in your portfolio needs a sentence of evidence, not just the goal icon."]}]')
on conflict (id) do update
  set title = excluded.title, topic = excluded.topic, quarter = excluded.quarter,
      sdgs = excluded.sdgs, pages = excluded.pages, size_kb = excluded.size_kb,
      summary = excluded.summary, published = excluded.published,
      generated = excluded.generated, sections = excluded.sections;

-- ---------------------------------------------------------------------
-- 7. announcements
-- ---------------------------------------------------------------------
insert into public.announcements (id, title, body, audience, author, pinned, created_at)
values
  ('an-01', 'Quarter 3 portfolio deadline', 'Submit at least six plates and two video activity sketches before the end of Quarter 3. Late work is accepted with a deduction.', 'all',      'Engr. Bea Villanueva', true,  now() - interval '2 days'),
  ('an-02', 'Reminder: student survey',     'The usefulness questionnaire closes this Friday. It takes about four minutes.',                            'students', 'Ms. Alma Domingo',     false, now() - interval '5 days'),
  ('an-03', 'New SDG 15 plate published',   'Plate 14, the sustainable packaging mock-up, is live in the drawings library.',                          'all',      'Mr. Rico Navarro',     false, now() - interval '9 days'),
  ('an-04', 'Rubric calibration meeting',   'Teachers: the quarterly rubric calibration meeting is Friday at 4:00 PM in the VGD lab.',                'teachers', 'Ms. Alma Domingo',     false, now() - interval '12 days')
on conflict (id) do update
  set title = excluded.title, body = excluded.body, audience = excluded.audience,
      pinned = excluded.pinned, created_at = excluded.created_at;

-- ---------------------------------------------------------------------
-- 8. sample learner data so analytics and research exports have content
--    Deterministic (hash-based) so reports stay consistent between runs.
-- ---------------------------------------------------------------------
insert into public.survey_responses (id, user_id, section, answers, submitted_at)
select
  'sur-' || p.id,
  p.id,
  p.section,
  (select jsonb_object_agg(
      'i' || n,
      case when n = 12
           then 6 - greatest(1, least(5, round(3.4 + ((abs(hashtext(p.id::text || n::text)) % 100) / 100 - 0.4) * 1.8)::int))
           else greatest(1, least(5, round(3.4 + ((abs(hashtext(p.id::text || n::text)) % 100) / 100 - 0.4) * 1.8)::int))
      end)
    from generate_series(1, 12) as n),
  now() - ((abs(hashtext(p.id::text)) % 20) || ' days')::interval
from public.profiles p
where p.role = 'student'
on conflict (user_id) do nothing;

insert into public.checklist_assessments (id, user_id, section, responses, self_assessed, submitted_at)
select
  'chk-' || p.id,
  p.id,
  p.section,
  (select jsonb_object_agg('c' || n,
      case when (abs(hashtext(p.id::text || n::text)) % 100) > 24 then 1 else 0 end)
     from generate_series(1, 12) as n),
  (abs(hashtext(p.id::text)) % 2) = 0,
  now() - ((abs(hashtext(p.id::text)) % 22) || ' days')::interval
from public.profiles p
where p.role = 'student'
on conflict (user_id) do nothing;

insert into public.submissions (id, kind, ref_id, student_id, section, file_name, notes,
                               status, feedback, rubric_scores, checklist_score, submitted_at)
select
  'seed-' || p.id || '-' || pl.id,
  'plate',
  pl.id,
  p.id,
  p.section,
  lower(regexp_replace(p.full_name, '[^a-zA-Z ]', '', 'g')) || '_' || pl.id || '_plate.png',
  '',
  case when (abs(hashtext(p.id::text || pl.id)) % 5) = 0 then 'submitted' else 'graded' end,
  case when (abs(hashtext(p.id::text || pl.id)) % 5) = 0 then ''
       else 'Consistent line weights. Tighten the title block lettering and add a centre line through the bore.' end,
  (select jsonb_object_agg('r' || n,
      greatest(1, least(5, round(3.2 + ((abs(hashtext(p.id::text || pl.id || n::text)) % 100) / 100 - 0.5) * 2.4)::int)))
     from generate_series(1, 5) as n),
  greatest(6, least(12, 9 + ((abs(hashtext(p.id::text)) % 4) - 1))),
  now() - ((((abs(hashtext(p.id::text || pl.id)) % 40) + 1)) || ' days')::interval
from public.profiles p
cross join public.plates pl
where p.role = 'student'
  and (abs(hashtext(p.id::text || pl.id)) % 100) < 45
on conflict (id) do nothing;

insert into public.lesson_progress (id, user_id, ref_id, status, page, last_opened)
select
  'pr-' || p.id || '-' || l.id,
  p.id,
  l.id,
  case when (abs(hashtext(p.id::text || l.id)) % 100) > 45 then 'opened' else 'completed' end,
  greatest(1, least(l.pages, round(l.pages * ((abs(hashtext(p.id::text || l.id)) % 100) / 100.0))::int)),
  now() - ((abs(hashtext(p.id::text || l.id)) % 25) || ' days')::interval
from public.profiles p
cross join public.lessons l
where p.role = 'student'
  and l.published
  and (abs(hashtext(p.id::text || l.id)) % 100) < 60
on conflict (user_id, ref_id) do nothing;

insert into public.activity_log (id, kind, user_id, ref_id, at)
select
  'act-' || p.id, 'seed', p.id, null,
  now() - ((abs(hashtext(p.id::text)) % 15) || ' days')::interval
from public.profiles p
where p.role = 'student'
on conflict (id) do nothing;

-- =====================================================================
--  DONE. Log in with:
--    maria.delacruz@student.vgd.edu.ph / student123
--    villanueva@vgd.edu.ph             / teacher123
--    sammymalik@admin.edu.ph           / admin123
-- =====================================================================
