-- Seed data: demo story from PROJECT_SPEC §6.7 and §9.
-- All data is synthetic. Ratings for Ahmed/Sara/Khaled reproduce the worked example.

-- Fixed IDs so re-runs and docs stay stable
-- Behaviors
insert into behaviors (id, key, name_en, name_ar, description, rubric) values
(
  'a1000000-0000-4000-8000-000000000001',
  'delegation',
  'Delegation and trust',
  'التفويض والثقة',
  'Hands over meaningful work and lets others own outcomes.',
  '{
    "25": {"en": "Keeps most tasks; rarely assigns meaningful work.", "ar": "يبقي معظم المهام لنفسه ونادراً ما يفوّض عملاً ذا قيمة."},
    "50": {"en": "Delegates some tasks but often redoes or closely controls the work.", "ar": "يفوّض بعض المهام لكنه غالباً يعيد العمل أو يسيطر عليه عن قرب."},
    "75": {"en": "Hands over meaningful tasks and lets others own outcomes, instead of redoing their work.", "ar": "يسلّم مهام ذات قيمة ويترك الآخرين يملكون النتيجة بدل إعادة عملهم."},
    "100": {"en": "Builds capacity by delegating stretch work with clear ownership and support.", "ar": "يبني قدرات الفريق بتفويض مهام تطويرية بملكية واضحة ودعم."}
  }'::jsonb
),
(
  'a1000000-0000-4000-8000-000000000002',
  'coaching',
  'Coaching and feedback',
  'التوجيه والملاحظات',
  'Gives specific, timely feedback that helps others improve.',
  '{
    "25": {"en": "Gives little feedback; others do not know how to improve.", "ar": "يقدّم ملاحظات قليلة ولا يعرف الآخرون كيف يتحسنون."},
    "50": {"en": "Gives occasional feedback, often vague or late.", "ar": "يقدّم ملاحظات أحياناً وتكون عامة أو متأخرة."},
    "75": {"en": "Gives specific, timely feedback and helps others improve.", "ar": "يعطي ملاحظات محددة في وقتها ويساعد الآخرين على التحسن."},
    "100": {"en": "Coaches consistently; others grow visibly under their guidance.", "ar": "يوجّه باستمرار وينمو الآخرون بوضوح تحت إرشاده."}
  }'::jsonb
),
(
  'a1000000-0000-4000-8000-000000000003',
  'accountability',
  'Accountability',
  'تحمّل المسؤولية',
  'Owns results and mistakes; follows through on commitments.',
  '{
    "25": {"en": "Avoids ownership when things go wrong.", "ar": "يتجنب تحمل المسؤولية عند حدوث مشاكل."},
    "50": {"en": "Owns some outcomes; follow-through is uneven.", "ar": "يتحمل بعض النتائج والمتابعة غير منتظمة."},
    "75": {"en": "Owns results and mistakes; follows through on commitments.", "ar": "يتحمل النتائج والأخطاء ويفي بالتزاماته."},
    "100": {"en": "Sets a standard of ownership others rely on under pressure.", "ar": "يضع معياراً لتحمل المسؤولية يعتمد عليه الآخرون تحت الضغط."}
  }'::jsonb
),
(
  'a1000000-0000-4000-8000-000000000004',
  'fairness',
  'Fairness',
  'العدالة',
  'Applies decisions and recognition consistently.',
  '{
    "25": {"en": "Decisions and recognition feel uneven across the team.", "ar": "القرارات والتقدير غير متساويين عبر الفريق."},
    "50": {"en": "Usually fair, with occasional inconsistencies.", "ar": "عادة عادل مع بعض التفاوت أحياناً."},
    "75": {"en": "Applies decisions and recognition consistently across the team.", "ar": "يطبق القرارات والتقدير بالتساوي على الفريق."},
    "100": {"en": "Team trusts process and treatment even in hard trade-offs.", "ar": "يثق الفريق بالعملية والمعاملة حتى في المفاضلات الصعبة."}
  }'::jsonb
),
(
  'a1000000-0000-4000-8000-000000000005',
  'conflict',
  'Conflict handling',
  'معالجة الخلافات',
  'Addresses tension early and constructively.',
  '{
    "25": {"en": "Avoids or postpones conflict until it harms the work.", "ar": "يتجنب الخلاف أو يؤجله حتى يضر بالعمل."},
    "50": {"en": "Addresses some conflicts; others linger.", "ar": "يعالج بعض الخلافات وتبقى أخرى معلّقة."},
    "75": {"en": "Addresses tension early and constructively.", "ar": "يعالج التوتر مبكراً وبشكل بنّاء."},
    "100": {"en": "Turns conflict into clearer decisions and stronger working relationships.", "ar": "يحوّل الخلاف إلى قرارات أوضح وعلاقات عمل أقوى."}
  }'::jsonb
),
(
  'a1000000-0000-4000-8000-000000000006',
  'communication',
  'Communication',
  'التواصل',
  'Explains priorities and context clearly and listens.',
  '{
    "25": {"en": "Priorities and context are often unclear to others.", "ar": "الأولويات والسياق غالباً غير واضحين للآخرين."},
    "50": {"en": "Communicates adequately on request; listening is uneven.", "ar": "يتواصل بشكل مقبول عند الطلب والاستماع غير منتظم."},
    "75": {"en": "Explains priorities and context clearly and listens.", "ar": "يشرح الأولويات والسياق بوضوح وينصت."},
    "100": {"en": "Keeps the team aligned under ambiguity; others feel heard.", "ar": "يبقي الفريق متوافقاً وسط الغموض ويشعر الآخرون بأنهم مسموعون."}
  }'::jsonb
);

-- Role: Team Manager (§6.7)
insert into roles (id, slug, title_en, title_ar, department_en, department_ar) values
(
  'b1000000-0000-4000-8000-000000000001',
  'team-manager',
  'Team Manager',
  'مدير فريق',
  'Analytics',
  'قسم التحليلات'
);

insert into role_behavior_requirements (role_id, behavior_id, required_level, weight, is_critical) values
('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 75, 20, true),
('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 75, 20, false),
('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', 75, 15, false),
('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000004', 75, 15, false),
('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000005', 50, 15, false),
('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000006', 75, 15, false);

-- Employees (slug keeps existing routes, e.g. ahmad)
insert into employees (id, slug, full_name_en, full_name_ar, title_en, title_ar, department_en, department_ar, tenure_months, skills) values
('c1000000-0000-4000-8000-000000000001', 'ahmad', 'Ahmed Al-Otaibi', 'أحمد العتيبي', 'Senior Data Analyst', 'محلل بيانات أول', 'Analytics', 'قسم التحليلات', 36, '[{"name":"SQL","level":75},{"name":"Power BI","level":50}]'::jsonb),
('c1000000-0000-4000-8000-000000000002', 'sara', 'Sara Al-Qahtani', 'سارة القحطاني', 'Senior Business Analyst', 'محللة أعمال أولى', 'Analytics', 'قسم التحليلات', 48, '[{"name":"SQL","level":75}]'::jsonb),
('c1000000-0000-4000-8000-000000000003', 'khaled', 'Khaled Al-Zahrani', 'خالد الزهراني', 'Senior Developer', 'مطور أول', 'Engineering', 'قسم الهندسة', 40, '[{"name":"Python","level":75}]'::jsonb),
('c1000000-0000-4000-8000-000000000004', 'omar', 'Omar Al-Shehri', 'عمر الشهري', 'Data Engineer', 'مهندس بيانات', 'Analytics', 'قسم التحليلات', 18, '[]'::jsonb),
('c1000000-0000-4000-8000-000000000005', 'lama', 'Lama Al-Harbi', 'لمى الحربي', 'Business Analyst', 'محللة أعمال', 'Analytics', 'قسم التحليلات', 24, '[]'::jsonb),
('c1000000-0000-4000-8000-000000000006', 'noura', 'Noura Al-Mutairi', 'نورة المطيري', 'Reporting Specialist', 'أخصائية تقارير', 'Analytics', 'قسم التحليلات', 12, '[]'::jsonb);

-- Helper: create a submission then ratings
-- Ahmed: scores delegation 50, coaching 50, accountability 100, fairness 75, conflict 25, communication 75
-- Self rates delegation 100 (blind spot). Free text in EN and AR for Phase 3 AI.

insert into feedback_submissions (id, employee_id, rater_type, rater_name, free_text, language, submitted_at) values
(
  'd1000000-0000-4000-8000-000000000011',
  'c1000000-0000-4000-8000-000000000001',
  'manager',
  'Noura (manager)',
  'Ahmed delivers excellent analysis and rarely misses a deadline. When team members hand in their work, he often redoes it himself overnight instead of giving feedback. He took ownership when the dashboard failed last quarter.',
  'en',
  '2026-08-01T10:00:00Z'
),
(
  'd1000000-0000-4000-8000-000000000012',
  'c1000000-0000-4000-8000-000000000001',
  'manager',
  'نورة (المدير)',
  'يقدّم أحمد تحليلاً ممتازاً ونادراً ما يفوّت موعداً. عندما يسلّم أعضاء الفريق عملهم، غالباً ما يعيد إنجازه بنفسه طوال الليل بدل إعطاء ملاحظات. تحمّل المسؤولية عندما تعطّلت لوحة المعلومات في الربع الماضي.',
  'ar',
  '2026-08-01T10:05:00Z'
),
(
  'd1000000-0000-4000-8000-000000000013',
  'c1000000-0000-4000-8000-000000000001',
  'peer',
  'Peer reviewer',
  'Great to work with on technical problems. In a disagreement about priorities he went quiet and the issue stayed unresolved for weeks.',
  'en',
  '2026-08-05T10:00:00Z'
),
(
  'd1000000-0000-4000-8000-000000000014',
  'c1000000-0000-4000-8000-000000000001',
  'peer',
  'زميل',
  'ممتاز في العمل على المشاكل التقنية. في خلاف حول الأولويات صمت وبقيت المسألة دون حل لأسابيع.',
  'ar',
  '2026-08-05T10:05:00Z'
),
(
  'd1000000-0000-4000-8000-000000000015',
  'c1000000-0000-4000-8000-000000000001',
  'self',
  'Ahmed',
  null,
  'en',
  '2026-08-10T10:00:00Z'
),
(
  'd1000000-0000-4000-8000-000000000016',
  'c1000000-0000-4000-8000-000000000001',
  'document',
  'Project retrospective',
  null,
  'en',
  '2026-07-15T10:00:00Z'
);

-- Ahmed confirmed ratings (one per source type; averages already applied)
-- Behavior IDs: 1 delegation, 2 coaching, 3 accountability, 4 fairness, 5 conflict, 6 communication
insert into behavior_ratings (submission_id, employee_id, behavior_id, level, example, source, status, created_at) values
-- manager
('d1000000-0000-4000-8000-000000000011', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 50, 'Rewrites the reports himself instead of leaving them to a colleague', 'human', 'confirmed', '2026-08-01T10:00:00Z'),
('d1000000-0000-4000-8000-000000000011', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 50, 'Feedback is delayed when under delivery pressure', 'human', 'confirmed', '2026-08-01T10:00:00Z'),
('d1000000-0000-4000-8000-000000000011', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', 100, 'Owned the dashboard failure last quarter', 'human', 'confirmed', '2026-08-01T10:00:00Z'),
('d1000000-0000-4000-8000-000000000011', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000004', 75, 'Applied the same review standard to every teammate', 'human', 'confirmed', '2026-08-01T10:00:00Z'),
('d1000000-0000-4000-8000-000000000011', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000005', 25, 'Postpones talking about disagreement until everyone calms down', 'human', 'confirmed', '2026-08-01T10:00:00Z'),
('d1000000-0000-4000-8000-000000000011', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000006', 75, 'Explains analysis context clearly in standups', 'human', 'confirmed', '2026-08-01T10:00:00Z'),
-- peer
('d1000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 50, 'I rarely know which of his tasks I can take on', 'human', 'confirmed', '2026-08-05T10:00:00Z'),
('d1000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 50, 'Explained how to present results once, then went quiet', 'human', 'confirmed', '2026-08-05T10:00:00Z'),
('d1000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', 100, 'Fixed the wrong numbers the same day they were raised', 'human', 'confirmed', '2026-08-05T10:00:00Z'),
('d1000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000004', 75, 'Credit for the dashboard was shared fairly', 'human', 'confirmed', '2026-08-05T10:00:00Z'),
('d1000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000005', 25, 'Went quiet in a priorities disagreement for weeks', 'human', 'confirmed', '2026-08-05T10:00:00Z'),
('d1000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000006', 75, 'Listens in technical design reviews', 'human', 'confirmed', '2026-08-05T10:00:00Z'),
-- document (accountability evidence)
('d1000000-0000-4000-8000-000000000016', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', 100, 'Retrospective note: owned the number error in the leadership meeting', 'human', 'confirmed', '2026-07-15T10:00:00Z'),
-- self (excluded from score; blind spot on delegation)
('d1000000-0000-4000-8000-000000000015', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 100, 'I delegate everything that can be delegated', 'human', 'confirmed', '2026-08-10T10:00:00Z'),
('d1000000-0000-4000-8000-000000000015', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 75, 'I coach juniors weekly', 'human', 'confirmed', '2026-08-10T10:00:00Z'),
('d1000000-0000-4000-8000-000000000015', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', 75, 'I own my deliveries', 'human', 'confirmed', '2026-08-10T10:00:00Z'),
('d1000000-0000-4000-8000-000000000015', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000004', 75, 'I treat people the same', 'human', 'confirmed', '2026-08-10T10:00:00Z'),
('d1000000-0000-4000-8000-000000000015', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000005', 50, 'I wait until people cool down', 'human', 'confirmed', '2026-08-10T10:00:00Z'),
('d1000000-0000-4000-8000-000000000015', 'c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000006', 75, 'I explain the why behind requests', 'human', 'confirmed', '2026-08-10T10:00:00Z');

-- Sara: 75,75,75,75,50,75 → Ready now (manager + peer + document where needed)
insert into feedback_submissions (id, employee_id, rater_type, rater_name, free_text, language, submitted_at) values
('d1000000-0000-4000-8000-000000000021', 'c1000000-0000-4000-8000-000000000002', 'manager', 'Noura', null, 'en', '2026-08-01T12:00:00Z'),
('d1000000-0000-4000-8000-000000000022', 'c1000000-0000-4000-8000-000000000002', 'peer', 'Peer', null, 'en', '2026-08-02T12:00:00Z'),
('d1000000-0000-4000-8000-000000000023', 'c1000000-0000-4000-8000-000000000002', 'document', 'Retro', null, 'en', '2026-08-03T12:00:00Z'),
('d1000000-0000-4000-8000-000000000024', 'c1000000-0000-4000-8000-000000000002', 'self', 'Sara', null, 'en', '2026-08-04T12:00:00Z');

insert into behavior_ratings (submission_id, employee_id, behavior_id, level, example, source, status, created_at) values
('d1000000-0000-4000-8000-000000000021', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 75, 'Delegated the requirements workshop end-to-end', 'human', 'confirmed', '2026-08-01T12:00:00Z'),
('d1000000-0000-4000-8000-000000000021', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 75, 'Weekly coaching notes for two analysts', 'human', 'confirmed', '2026-08-01T12:00:00Z'),
('d1000000-0000-4000-8000-000000000021', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 75, 'Owned the release checklist miss and fixed process', 'human', 'confirmed', '2026-08-01T12:00:00Z'),
('d1000000-0000-4000-8000-000000000021', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000004', 75, 'Same criteria for every stakeholder request', 'human', 'confirmed', '2026-08-01T12:00:00Z'),
('d1000000-0000-4000-8000-000000000021', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000005', 50, 'Mediated a scope disagreement within two days', 'human', 'confirmed', '2026-08-01T12:00:00Z'),
('d1000000-0000-4000-8000-000000000021', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000006', 75, 'Clear written briefs for every sprint', 'human', 'confirmed', '2026-08-01T12:00:00Z'),
('d1000000-0000-4000-8000-000000000022', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 75, 'Let me own the customer interview synthesis', 'human', 'confirmed', '2026-08-02T12:00:00Z'),
('d1000000-0000-4000-8000-000000000022', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 75, 'Specific feedback after each demo', 'human', 'confirmed', '2026-08-02T12:00:00Z'),
('d1000000-0000-4000-8000-000000000022', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 75, 'Followed through on the action items she took', 'human', 'confirmed', '2026-08-02T12:00:00Z'),
('d1000000-0000-4000-8000-000000000022', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000004', 75, 'Fair rotation of presentation slots', 'human', 'confirmed', '2026-08-02T12:00:00Z'),
('d1000000-0000-4000-8000-000000000022', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000005', 50, 'Raised the conflict early in standup', 'human', 'confirmed', '2026-08-02T12:00:00Z'),
('d1000000-0000-4000-8000-000000000022', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000006', 75, 'Listens before proposing a path', 'human', 'confirmed', '2026-08-02T12:00:00Z'),
('d1000000-0000-4000-8000-000000000023', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 75, 'Retro: delegated discovery ownership', 'human', 'confirmed', '2026-08-03T12:00:00Z'),
('d1000000-0000-4000-8000-000000000023', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 75, 'Retro: owned the missed dependency', 'human', 'confirmed', '2026-08-03T12:00:00Z'),
('d1000000-0000-4000-8000-000000000024', 'c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 75, 'Self: I hand off discovery work', 'human', 'confirmed', '2026-08-04T12:00:00Z');

-- Khaled: 25,25,75,50,25,50 → Explore alternative path
insert into feedback_submissions (id, employee_id, rater_type, rater_name, free_text, language, submitted_at) values
('d1000000-0000-4000-8000-000000000031', 'c1000000-0000-4000-8000-000000000003', 'manager', 'Noura', null, 'en', '2026-08-01T14:00:00Z'),
('d1000000-0000-4000-8000-000000000032', 'c1000000-0000-4000-8000-000000000003', 'peer', 'Peer', null, 'en', '2026-08-02T14:00:00Z');

insert into behavior_ratings (submission_id, employee_id, behavior_id, level, example, source, status, created_at) values
('d1000000-0000-4000-8000-000000000031', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 25, 'Keeps implementation tasks to himself', 'human', 'confirmed', '2026-08-01T14:00:00Z'),
('d1000000-0000-4000-8000-000000000031', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 25, 'Little coaching of juniors', 'human', 'confirmed', '2026-08-01T14:00:00Z'),
('d1000000-0000-4000-8000-000000000031', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', 75, 'Owns bugs he ships', 'human', 'confirmed', '2026-08-01T14:00:00Z'),
('d1000000-0000-4000-8000-000000000031', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004', 50, 'Usually fair in code review', 'human', 'confirmed', '2026-08-01T14:00:00Z'),
('d1000000-0000-4000-8000-000000000031', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000005', 25, 'Avoids design disagreements', 'human', 'confirmed', '2026-08-01T14:00:00Z'),
('d1000000-0000-4000-8000-000000000031', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000006', 50, 'Writes clear tickets when asked', 'human', 'confirmed', '2026-08-01T14:00:00Z'),
('d1000000-0000-4000-8000-000000000032', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 25, 'Hard to take tasks from his plate', 'human', 'confirmed', '2026-08-02T14:00:00Z'),
('d1000000-0000-4000-8000-000000000032', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 25, 'Rarely gives pairing feedback', 'human', 'confirmed', '2026-08-02T14:00:00Z'),
('d1000000-0000-4000-8000-000000000032', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', 75, 'Stayed late to fix production', 'human', 'confirmed', '2026-08-02T14:00:00Z'),
('d1000000-0000-4000-8000-000000000032', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004', 50, 'Consistent review comments', 'human', 'confirmed', '2026-08-02T14:00:00Z'),
('d1000000-0000-4000-8000-000000000032', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000005', 25, 'Went quiet in a stack debate', 'human', 'confirmed', '2026-08-02T14:00:00Z'),
('d1000000-0000-4000-8000-000000000032', 'c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000006', 50, 'Explains trade-offs when prompted', 'human', 'confirmed', '2026-08-02T14:00:00Z');

-- Filler employees: thin evidence (Omar insufficient/specialist-bound)
insert into feedback_submissions (id, employee_id, rater_type, rater_name, free_text, language, submitted_at) values
('d1000000-0000-4000-8000-000000000041', 'c1000000-0000-4000-8000-000000000004', 'manager', 'Noura', null, 'en', '2026-08-01T16:00:00Z'),
('d1000000-0000-4000-8000-000000000051', 'c1000000-0000-4000-8000-000000000005', 'manager', 'Noura', null, 'en', '2026-08-01T16:30:00Z'),
('d1000000-0000-4000-8000-000000000052', 'c1000000-0000-4000-8000-000000000005', 'peer', 'Peer', null, 'en', '2026-08-02T16:30:00Z');

insert into behavior_ratings (submission_id, employee_id, behavior_id, level, example, source, status, created_at) values
('d1000000-0000-4000-8000-000000000041', 'c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 25, 'Holds pipelines tightly', 'human', 'confirmed', '2026-08-01T16:00:00Z'),
('d1000000-0000-4000-8000-000000000041', 'c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000002', 25, 'Minimal coaching', 'human', 'confirmed', '2026-08-01T16:00:00Z'),
('d1000000-0000-4000-8000-000000000041', 'c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000003', 50, 'Owns batch failures sometimes', 'human', 'confirmed', '2026-08-01T16:00:00Z'),
('d1000000-0000-4000-8000-000000000051', 'c1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 75, 'Delegated stakeholder prep', 'human', 'confirmed', '2026-08-01T16:30:00Z'),
('d1000000-0000-4000-8000-000000000051', 'c1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000002', 50, 'Feedback after workshops', 'human', 'confirmed', '2026-08-01T16:30:00Z'),
('d1000000-0000-4000-8000-000000000051', 'c1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000003', 75, 'Owned a missed requirement', 'human', 'confirmed', '2026-08-01T16:30:00Z'),
('d1000000-0000-4000-8000-000000000051', 'c1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000004', 50, 'Even facilitation', 'human', 'confirmed', '2026-08-01T16:30:00Z'),
('d1000000-0000-4000-8000-000000000051', 'c1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000005', 50, 'Surfaced a stakeholder conflict', 'human', 'confirmed', '2026-08-01T16:30:00Z'),
('d1000000-0000-4000-8000-000000000051', 'c1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000006', 75, 'Clear workshop agendas', 'human', 'confirmed', '2026-08-01T16:30:00Z'),
('d1000000-0000-4000-8000-000000000052', 'c1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 50, 'Shared interview notes ownership', 'human', 'confirmed', '2026-08-02T16:30:00Z'),
('d1000000-0000-4000-8000-000000000052', 'c1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000003', 75, 'Followed up on open risks', 'human', 'confirmed', '2026-08-02T16:30:00Z'),
('d1000000-0000-4000-8000-000000000052', 'c1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000006', 50, 'Listens in grooming', 'human', 'confirmed', '2026-08-02T16:30:00Z');
-- noura: no ratings → not assessed / insufficient evidence

-- Assumptions (sample estimates for P1 cost)
insert into assumptions (key, value, label) values
('replacement_hiring', 45000, 'Replacement hiring (SAR) — sample estimate'),
('productivity_loss', 60000, 'Team productivity loss (SAR) — sample estimate'),
('team_turnover', 30000, 'Team turnover cost (SAR) — sample estimate'),
('development_plan_cost', 20000, 'Development plan cost (SAR) — sample estimate');

-- Stored analyses / plans (fallback for demo; refined in Phase 4)
insert into development_analyses (employee_id, role_id, engine_snapshot, narrative, language, model) values
(
  'c1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  '{"role_match":79.17,"signal":"Develop first","critical_gaps":["delegation"]}'::jsonb,
  '{"summary":"Ahmed shows strong accountability and communication, with a critical gap in delegation and trust.","strengths":[{"behavior_key":"accountability","evidence":"Owned the dashboard failure"}],"development_areas":[{"behavior_key":"delegation","evidence":"Often redoes work overnight","why_it_matters":"Critical for Team Manager"}],"blind_spots":[{"behavior_key":"delegation","explanation":"Self 100 vs others 50"}],"readiness_view":{"signal":"Develop first","evidence_for":["Accountability at 100","Communication at 75"],"evidence_against":["Delegation at 50 vs required 75"],"missing_evidence":[]},"path_options":[{"option":"Develop first","rationale":"Close the critical delegation gap with a stretch assignment"},{"option":"Senior specialist track","rationale":"If he prefers deep analysis over people leadership"}],"caution":"A human decides. This is a readiness signal, not a prediction."}'::jsonb,
  'en',
  'seed'
),
(
  'c1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  '{"role_match":79.17,"signal":"Develop first","critical_gaps":["delegation"]}'::jsonb,
  '{"summary":"يُظهر أحمد تحمّلاً قوياً للمسؤولية وتواصلاً جيداً، مع فجوة حرجة في التفويض والثقة.","strengths":[{"behavior_key":"accountability","evidence":"تحمّل تعطل لوحة المعلومات"}],"development_areas":[{"behavior_key":"delegation","evidence":"غالباً يعيد العمل بنفسه طوال الليل","why_it_matters":"حرج لدور مدير الفريق"}],"blind_spots":[{"behavior_key":"delegation","explanation":"تقييمه لنفسه 100 مقابل الآخرين 50"}],"readiness_view":{"signal":"Develop first","evidence_for":["تحمّل المسؤولية 100","التواصل 75"],"evidence_against":["التفويض 50 مقابل المطلوب 75"],"missing_evidence":[]},"path_options":[{"option":"طوّر أولاً","rationale":"أغلق فجوة التفويض الحرجة بمهمة تطويرية"},{"option":"مسار أخصائي أول","rationale":"إذا فضّل العمق التحليلي على قيادة الناس"}],"caution":"القرار للإنسان. هذه إشارة جاهزية وليست توقعاً."}'::jsonb,
  'ar',
  'seed'
);

insert into development_plans (employee_id, role_id, items, language) values
(
  'c1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  '[{"behavior_key":"delegation","type":"stretch_assignment","title":"Lead a small project with real task handoff","description":"Lead a 6-week mini project and delegate meaningful tasks to colleagues.","duration_weeks":6,"success_evidence":"New manager and peer ratings for delegation at 75+ with concrete examples"},{"behavior_key":"delegation","type":"mentoring","title":"Monthly mentoring with an experienced manager","description":"Review delegation decisions and feedback quality.","duration_weeks":12,"success_evidence":"Mentor-confirmed examples of others owning outcomes"},{"behavior_key":"conflict","type":"practice","title":"Practice early conflict conversations","description":"Address one live disagreement within one week of noticing it.","duration_weeks":8,"success_evidence":"Peer rating for conflict handling with a resolved example"}]'::jsonb,
  'en'
),
(
  'c1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  '[{"behavior_key":"delegation","type":"stretch_assignment","title":"قيادة مشروع صغير مع تفويض حقيقي","description":"قد مشروعاً مصغراً لمدة 6 أسابيع وفوّض مهام ذات قيمة لزملائك.","duration_weeks":6,"success_evidence":"تقييمات جديدة من المدير والزملاء للتفويض عند 75 فأكثر مع أمثلة"},{"behavior_key":"delegation","type":"mentoring","title":"إرشاد شهري مع مدير خبير","description":"راجع قرارات التفويض وجودة الملاحظات.","duration_weeks":12,"success_evidence":"أمثلة مؤكدة من المرشد على ملكية الآخرين للنتائج"},{"behavior_key":"conflict","type":"practice","title":"ممارسة معالجة الخلاف مبكراً","description":"عالج خلافًا حيًا خلال أسبوع من ملاحظته.","duration_weeks":8,"success_evidence":"تقييم زميل لمعالجة الخلافات مع مثال محلول"}]'::jsonb,
  'ar'
);

insert into development_analyses (employee_id, role_id, engine_snapshot, narrative, language, model) values
(
  'c1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000001',
  '{"role_match":100,"signal":"Ready now"}'::jsonb,
  '{"summary":"Sara meets the Team Manager behavior requirements with solid multi-source evidence.","readiness_view":{"signal":"Ready now","evidence_for":["All required behaviors met"],"evidence_against":[],"missing_evidence":[]},"caution":"A human decides."}'::jsonb,
  'en',
  'seed'
),
(
  'c1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000001',
  '{"role_match":55.83,"signal":"Explore alternative path"}'::jsonb,
  '{"summary":"Khaled is stronger as a senior specialist than as a people manager on current evidence.","readiness_view":{"signal":"Explore alternative path","evidence_for":["Accountability holds"],"evidence_against":["Delegation and coaching well below requirement"],"missing_evidence":[]},"caution":"A human decides."}'::jsonb,
  'en',
  'seed'
);

insert into development_plans (employee_id, role_id, items, language) values
(
  'c1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000001',
  '[{"behavior_key":"conflict","type":"practice","title":"Keep addressing tension early","description":"Continue early mediation practice on live work.","duration_weeks":4,"success_evidence":"Ongoing peer examples of constructive conflict handling"}]'::jsonb,
  'en'
),
(
  'c1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000001',
  '[{"behavior_key":"delegation","type":"mentoring","title":"Specialist-track mentoring","description":"Explore senior IC path while optionally practicing light delegation.","duration_weeks":12,"success_evidence":"Clear path choice recorded by manager"}]'::jsonb,
  'en'
);
