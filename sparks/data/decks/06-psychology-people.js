(self.SPARKS_DECKS = self.SPARKS_DECKS || []).push({
  id: 'psychology-people',
  order: 6,
  emoji: '🧠',
  title: { en: 'Psychology & People', ar: 'علم النفس والناس' },
  blurb: { en: 'How minds work, misfire and connect with each other.', ar: 'كيف تعمل العقول وتخطئ وتتواصل فيما بينها.' },
  cards: [
    {
      id: 'pp-01',
      title: { en: 'Confirmation Bias', ar: 'الانحياز التأكيدي' },
      body: {
        en: "A manager is convinced a new employee is lazy. Over the next month, she notices every late arrival and every long coffee break, but somehow overlooks the evenings he stays to finish reports. Her opinion feels more confirmed each week. Psychologists call this confirmation bias: the tendency to search for, notice, interpret and remember information in ways that support what we already believe. It is one of the most robust findings in the study of reasoning. A practical defence is to ask deliberately what evidence would prove you wrong, and then go looking for it.",
        ar: "اقتنعت مديرة بأن موظفًا جديدًا كسول. وخلال الشهر التالي لاحظت كل تأخر في الحضور وكل استراحة طويلة، لكنها أغفلت بطريقة ما الأمسيات التي بقي فيها لإنهاء التقارير، فبدا رأيها أكثر رسوخًا كل أسبوع. يسمي علماء النفس هذا الانحياز التأكيدي، وهو ميلنا إلى البحث عن المعلومات وملاحظتها وتفسيرها وتذكرها بطرق تدعم ما نعتقده سلفًا. وهو من أرسخ النتائج في دراسة التفكير. ومن الوسائل العملية لمقاومته أن تسأل نفسك عمدًا: ما الدليل الذي سيثبت خطئي؟ ثم تبحث عنه."
      },
      takeaway: { en: 'Look for evidence that could prove you wrong.', ar: 'ابحث عن الدليل الذي قد يثبت خطأك.' },
      source: { title: 'Wikipedia — Confirmation bias', url: 'https://en.wikipedia.org/wiki/Confirmation_bias' },
      quiz: {
        q: { en: 'What is confirmation bias?', ar: 'ما الانحياز التأكيدي؟' },
        options: {
          en: ['Favouring information that supports existing beliefs', 'Changing your mind too easily', 'Forgetting everything you have learned'],
          ar: ['تفضيل المعلومات التي تدعم المعتقدات القائمة', 'تغيير الرأي بسهولة مفرطة', 'نسيان كل ما تعلمته']
        },
        answer: 0,
        explain: { en: 'We tend to notice and remember what fits our views, like the manager who overlooked the late evenings.', ar: 'نميل إلى ملاحظة ما يوافق آراءنا وتذكره، كالمديرة التي أغفلت أمسيات العمل الطويلة.' }
      }
    },
    {
      id: 'pp-02',
      title: { en: 'Anchoring: The First Number Sticks', ar: 'الإرساء: الرقم الأول يلتصق بالذهن' },
      body: {
        en: "At a market stall, a seller names a wildly high price for a rug. You laugh, haggle hard, and walk away proud of paying half. But was half actually a good deal? The first number shaped your sense of what was reasonable. This is anchoring: an initial value, even an irrelevant one, pulls later estimates towards it. Amos Tversky and Daniel Kahneman demonstrated it in classic experiments, and it appears in negotiations, salaries and price tags. Knowing the effect does not fully protect you, but researching a fair value before you hear any offer helps.",
        ar: "في كشك بالسوق، يذكر البائع سعرًا مرتفعًا جدًا لسجادة، فتضحك وتساوم بشدة وتنصرف فخورًا بأنك دفعت النصف. لكن هل كان النصف صفقة جيدة فعلًا؟ لقد شكّل الرقم الأول تصورك لما هو معقول. هذا هو الإرساء: قيمة أولية، ولو كانت لا علاقة لها بالموضوع، تجذب التقديرات اللاحقة نحوها. وقد أثبته عاموس تفيرسكي ودانيال كانمان في تجارب شهيرة، ويظهر في المفاوضات والرواتب وبطاقات الأسعار. معرفة هذا الأثر لا تحميك تمامًا، لكن البحث عن القيمة العادلة قبل سماع أي عرض يساعدك."
      },
      takeaway: { en: 'Set your own reference point before anyone else sets it for you.', ar: 'حدّد نقطتك المرجعية قبل أن يحددها لك غيرك.' },
      source: { title: 'Wikipedia — Anchoring effect', url: 'https://en.wikipedia.org/wiki/Anchoring_effect' },
      quiz: {
        q: { en: 'What is the best defence against anchoring in a negotiation?', ar: 'ما أفضل دفاع ضد الإرساء في التفاوض؟' },
        options: {
          en: ['Always accept the first offer', 'Research a fair value before hearing any offer', 'Ignore all numbers completely'],
          ar: ['قبول العرض الأول دائمًا', 'البحث عن القيمة العادلة قبل سماع أي عرض', 'تجاهل كل الأرقام تمامًا']
        },
        answer: 1,
        explain: { en: 'Having your own reference point reduces the pull of the first number you hear.', ar: 'امتلاك نقطة مرجعية خاصة بك يخفف من جاذبية الرقم الأول الذي تسمعه.' }
      }
    },
    {
      id: 'pp-03',
      title: { en: 'The Spotlight Effect', ar: 'تأثير بقعة الضوء' },
      body: {
        en: "A student spills coffee on his shirt before a big presentation and spends the whole talk sure everyone is staring at the stain. Afterwards, almost nobody remembers it. Psychologists call this the spotlight effect: we overestimate how much others notice our appearance and mistakes. In a well-known study, students asked to wear an embarrassing T-shirt into a room greatly overestimated how many people noticed it. The reason is simple: we are the centre of our own experience, while everyone else is busy being the centre of theirs. Your stumble is rarely their headline.",
        ar: "يسكب طالب القهوة على قميصه قبل عرض تقديمي مهم، ويقضي العرض كله متيقنًا من أن الجميع يحدّقون في البقعة. وبعد ذلك لا يكاد أحد يتذكرها. يسمي علماء النفس هذا تأثير بقعة الضوء، أي ميلنا إلى المبالغة في تقدير مدى ملاحظة الآخرين لمظهرنا وأخطائنا. ففي دراسة معروفة، طُلب من طلاب ارتداء قميص محرج ودخول غرفة، فبالغوا كثيرًا في تقدير عدد من لاحظه. والسبب بسيط: كل منا مركز تجربته الخاصة، بينما الآخرون منشغلون بكونهم مركز تجاربهم. زلّتك نادرًا ما تكون حديثهم الأول."
      },
      takeaway: { en: 'People notice you far less than you think.', ar: 'الناس يلاحظونك أقل بكثير مما تظن.' },
      source: { title: 'Wikipedia — Spotlight effect', url: 'https://en.wikipedia.org/wiki/Spotlight_effect' },
      quiz: {
        q: { en: 'What does the spotlight effect describe?', ar: 'ماذا يصف تأثير بقعة الضوء؟' },
        options: {
          en: ['Enjoying being on stage', 'Ignoring other people’s mistakes', 'Overestimating how much others notice us'],
          ar: ['الاستمتاع بالوقوف على المسرح', 'تجاهل أخطاء الآخرين', 'المبالغة في تقدير ملاحظة الآخرين لنا']
        },
        answer: 2,
        explain: { en: 'We feel watched because we are central to our own experience, but others mostly focus on themselves.', ar: 'نشعر بأننا مراقَبون لأننا محور تجربتنا، بينما ينشغل الآخرون غالبًا بأنفسهم.' }
      }
    },
    {
      id: 'pp-04',
      title: { en: 'The Habit Loop', ar: 'حلقة العادة' },
      body: {
        en: "Every afternoon at three, an office worker feels a slump, walks to the vending machine, buys a chocolate bar, and chats with colleagues. She does not decide to do it; it simply happens. Researchers describe many habits as a loop: a cue triggers a routine, which delivers a reward. Over time the brain links the cue to the reward and runs the routine almost automatically. To change a habit, it often works better to keep the cue and the reward but swap the routine, for example taking a short walk with colleagues instead of buying a snack.",
        ar: "في الثالثة من عصر كل يوم، تشعر موظفة بالفتور، فتمشي إلى آلة البيع وتشتري لوح شوكولاتة وتتحدث مع زملائها. هي لا تقرر ذلك، بل يحدث تلقائيًا. يصف الباحثون كثيرًا من العادات بأنها حلقة: إشارة تطلق سلوكًا روتينيًا، يعقبه مكافأة. ومع الوقت يربط الدماغ الإشارة بالمكافأة وينفّذ السلوك شبه آليًا. ولتغيير عادة ما، كثيرًا ما يكون الأجدى الإبقاء على الإشارة والمكافأة مع استبدال السلوك نفسه، كأن تتمشى قليلًا مع زملائها بدل شراء الحلوى."
      },
      takeaway: { en: 'Keep the cue and reward, change the routine.', ar: 'أبقِ الإشارة والمكافأة، وغيّر السلوك.' },
      source: { title: 'Wikipedia — Habit', url: 'https://en.wikipedia.org/wiki/Habit' },
      quiz: {
        q: { en: 'What are the three parts of the habit loop?', ar: 'ما الأجزاء الثلاثة لحلقة العادة؟' },
        options: {
          en: ['Goal, plan and deadline', 'Cue, routine and reward', 'Thought, feeling and memory'],
          ar: ['الهدف والخطة والموعد النهائي', 'الإشارة والسلوك والمكافأة', 'الفكرة والشعور والذاكرة']
        },
        answer: 1,
        explain: { en: 'A cue triggers a routine that delivers a reward, and repetition makes the link automatic.', ar: 'تطلق الإشارة سلوكًا يجلب مكافأة، والتكرار يجعل هذا الارتباط تلقائيًا.' }
      }
    },
    {
      id: 'pp-05',
      title: { en: 'Growth Mindset, With Caveats', ar: 'عقلية النمو مع بعض التحفظات' },
      body: {
        en: "Two students fail the same maths test. One concludes she is just not a maths person. The other decides she needs a better study method. Psychologist Carol Dweck called the first view a fixed mindset and the second a growth mindset: the belief that abilities can be developed through effort and good strategies. The idea became hugely popular in schools. However, later large studies found that the effects of brief mindset interventions on grades are often small and vary across groups. A reasonable conclusion is that believing you can improve helps, but it is no magic switch.",
        ar: "ترسب طالبتان في اختبار الرياضيات نفسه؛ تستنتج الأولى أنها ببساطة ليست موهوبة في الرياضيات، وتقرر الثانية أنها تحتاج إلى طريقة مذاكرة أفضل. سمّت عالمة النفس كارول دويك النظرة الأولى العقلية الثابتة، والثانية عقلية النمو، أي الاعتقاد بأن القدرات يمكن تطويرها بالجهد والاستراتيجيات الجيدة. انتشرت الفكرة انتشارًا واسعًا في المدارس، لكن دراسات لاحقة واسعة وجدت أن أثر التدخلات القصيرة لتغيير العقلية في الدرجات غالبًا ما يكون صغيرًا ويتفاوت بين الفئات. والخلاصة المعقولة أن الإيمان بقدرتك على التحسن مفيد، لكنه ليس مفتاحًا سحريًا."
      },
      takeaway: { en: 'Believing you can grow helps, but effort and strategy do the work.', ar: 'الإيمان بقدرتك على النمو مفيد، لكن الجهد والاستراتيجية هما ما يصنع الفرق.' },
      source: { title: 'Wikipedia — Mindset', url: 'https://en.wikipedia.org/wiki/Mindset' },
      quiz: {
        q: { en: 'What have later large studies suggested about brief mindset interventions?', ar: 'ماذا أظهرت الدراسات الواسعة اللاحقة عن التدخلات القصيرة لتغيير العقلية؟' },
        options: {
          en: ['They always double students’ grades', 'They have been proven completely useless', 'Their effects are often small and vary across groups'],
          ar: ['تضاعف درجات الطلاب دائمًا', 'ثبت أنها عديمة الفائدة تمامًا', 'آثارها غالبًا صغيرة وتتفاوت بين الفئات']
        },
        answer: 2,
        explain: { en: 'Research suggests modest, uneven benefits, so the idea is helpful but not a magic switch.', ar: 'تشير الأبحاث إلى فوائد متواضعة ومتفاوتة، فالفكرة مفيدة لكنها ليست حلًا سحريًا.' }
      }
    },
    {
      id: 'pp-06',
      title: { en: 'Active Listening', ar: 'الإصغاء الفعّال' },
      body: {
        en: "A colleague starts describing a frustrating day. Before she finishes, her friend jumps in with advice, then a similar story of his own. She leaves feeling unheard. Active listening is the opposite approach: giving full attention, letting the speaker finish, reflecting back what you heard in your own words, and asking open questions before offering solutions. The idea is strongly associated with psychologist Carl Rogers and is now taught to counsellors, doctors and managers. It sounds simple, but it requires resisting the urge to plan your reply while the other person is still talking.",
        ar: "تبدأ زميلة في وصف يوم مرهق، وقبل أن تنهي كلامها يقاطعها صديقها بنصيحة، ثم بقصة مشابهة عن نفسه، فتغادر وهي تشعر بأن أحدًا لم يسمعها. الإصغاء الفعّال هو النهج المعاكس: أن تمنح انتباهك الكامل، وتدع المتحدث يُكمل، وتعيد صياغة ما سمعته بكلماتك، وتطرح أسئلة مفتوحة قبل تقديم الحلول. ترتبط الفكرة ارتباطًا وثيقًا بعالم النفس كارل روجرز، وتُدرَّس اليوم للمرشدين والأطباء والمديرين. تبدو بسيطة، لكنها تتطلب مقاومة الرغبة في التفكير في ردك بينما الآخر ما زال يتكلم."
      },
      takeaway: { en: 'Understand first, advise second.', ar: 'افهم أولًا، ثم انصح.' },
      source: { title: 'Wikipedia — Active listening', url: 'https://en.wikipedia.org/wiki/Active_listening' },
      quiz: {
        q: { en: 'Which behaviour is part of active listening?', ar: 'أيّ سلوك مما يلي جزء من الإصغاء الفعّال؟' },
        options: {
          en: ['Reflecting back what you heard in your own words', 'Offering advice as soon as possible', 'Sharing a similar story of your own right away'],
          ar: ['إعادة صياغة ما سمعته بكلماتك', 'تقديم النصيحة في أسرع وقت', 'مشاركة قصة مشابهة عن نفسك فورًا']
        },
        answer: 0,
        explain: { en: 'Reflecting back shows understanding and lets the speaker correct you before you offer solutions.', ar: 'إعادة الصياغة تُظهر الفهم وتتيح للمتحدث تصحيحك قبل أن تقدم الحلول.' }
      }
    },
    {
      id: 'pp-07',
      title: { en: 'Cognitive Dissonance', ar: 'التنافر المعرفي' },
      body: {
        en: "A man buys an expensive car after weeks of hesitation. Afterwards he reads glowing reviews of it and skips the critical ones. Why? Holding two conflicting thoughts, such as I am sensible and I may have wasted money, creates discomfort. Psychologist Leon Festinger named this cognitive dissonance and proposed that people work to reduce it, often by changing their beliefs or seeking reassuring information rather than admitting a mistake. The theory has been influential for decades, though researchers still debate some of its details. Spotting the urge to justify yourself is the first step to thinking clearly.",
        ar: "يشتري رجل سيارة باهظة بعد أسابيع من التردد، ثم يقرأ المراجعات المادحة لها ويتجاوز الناقدة. لماذا؟ لأن حمل فكرتين متعارضتين، مثل أنا شخص عاقل وربما أهدرت مالي، يسبب انزعاجًا. سمّى عالم النفس ليون فستنغر هذا التنافر المعرفي، ورأى أن الناس يسعون إلى تخفيفه، غالبًا بتغيير معتقداتهم أو البحث عن معلومات مطمئنة بدل الاعتراف بالخطأ. وقد ظلت النظرية مؤثرة عقودًا، وإن كان الباحثون ما زالوا يناقشون بعض تفاصيلها. إن انتباهك إلى رغبتك في تبرير نفسك هو الخطوة الأولى نحو التفكير بوضوح."
      },
      takeaway: { en: 'When you rush to justify a choice, pause and check it honestly.', ar: 'حين تسارع إلى تبرير قرارك، توقف وراجعه بصدق.' },
      source: { title: 'Wikipedia — Cognitive dissonance', url: 'https://en.wikipedia.org/wiki/Cognitive_dissonance' },
      quiz: {
        q: { en: 'How do people often reduce cognitive dissonance?', ar: 'كيف يخفف الناس غالبًا من التنافر المعرفي؟' },
        options: {
          en: ['By openly admitting every mistake', 'By seeking reassuring information or changing beliefs', 'By avoiding all decisions forever'],
          ar: ['بالاعتراف الصريح بكل خطأ', 'بالبحث عن معلومات مطمئنة أو تغيير المعتقدات', 'بتجنب اتخاذ أي قرار إلى الأبد']
        },
        answer: 1,
        explain: { en: 'Like the car buyer reading only positive reviews, people ease the discomfort by reassuring themselves.', ar: 'كمشتري السيارة الذي يقرأ المراجعات المادحة فقط، يخفف الناس الانزعاج بطمأنة أنفسهم.' }
      }
    },
    {
      id: 'pp-08',
      title: { en: 'The Planning Fallacy', ar: 'مغالطة التخطيط' },
      body: {
        en: "A family plans to renovate their kitchen in three weeks. Three months later, they are still washing dishes in the bathroom. They are not unusual. Kahneman and Tversky described the planning fallacy: our tendency to underestimate how long tasks will take, even when we know similar projects ran late before. We imagine the best-case path and ignore delays we cannot foresee. A useful remedy is to take the outside view: instead of picturing your own plan, look at how long comparable projects actually took for others, and plan around that reality.",
        ar: "تخطط عائلة لتجديد مطبخها في ثلاثة أسابيع، وبعد ثلاثة أشهر ما زالت تغسل الصحون في الحمّام. وهي ليست حالة نادرة؛ فقد وصف كانمان وتفيرسكي مغالطة التخطيط، أي ميلنا إلى الاستهانة بالوقت الذي تستغرقه المهام، حتى حين نعلم أن مشروعات مشابهة تأخرت من قبل. فنحن نتخيل أفضل مسار ممكن ونتجاهل التأخيرات التي لا نتوقعها. ومن العلاجات المفيدة اعتماد النظرة الخارجية: بدل تصور خطتك أنت، انظر إلى المدة التي استغرقتها مشروعات مماثلة لدى الآخرين فعلًا، وخطط بناءً على ذلك الواقع."
      },
      takeaway: { en: 'Plan using how long similar projects really took.', ar: 'خطط بناءً على المدة الفعلية لمشروعات مماثلة.' },
      source: { title: 'Wikipedia — Planning fallacy', url: 'https://en.wikipedia.org/wiki/Planning_fallacy' },
      quiz: {
        q: { en: 'What is the outside view as a remedy for the planning fallacy?', ar: 'ما النظرة الخارجية بوصفها علاجًا لمغالطة التخطيط؟' },
        options: {
          en: ['Looking at how long similar projects actually took', 'Planning only for the best-case scenario', 'Asking an outsider to do the work for you'],
          ar: ['النظر إلى المدة الفعلية لمشروعات مماثلة', 'التخطيط لأفضل الاحتمالات فقط', 'تكليف شخص من الخارج بأداء العمل عنك']
        },
        answer: 0,
        explain: { en: 'Comparable real projects give a more realistic estimate than imagining your own ideal plan.', ar: 'المشروعات الحقيقية المماثلة تعطي تقديرًا أكثر واقعية من تخيّل خطتك المثالية.' }
      }
    },
    {
      id: 'pp-09',
      title: { en: 'Dunning–Kruger: Knowing What You Don’t Know', ar: 'تأثير دانينغ وكروغر: أن تعرف ما تجهله' },
      body: {
        en: "A beginner chess player wins three games and starts thinking he could beat a master. After a year of serious study, he realises how much he still does not know. Psychologists David Dunning and Justin Kruger reported that people with low skill in a task tend to overestimate their performance, partly because the skills needed to do well are also needed to judge doing well. The effect is often exaggerated online; some researchers argue part of it reflects statistical artefacts. Still, the core lesson holds: feedback from others reveals blind spots that self-assessment misses.",
        ar: "يفوز لاعب شطرنج مبتدئ في ثلاث مباريات فيظن أنه قادر على هزيمة أستاذ كبير، وبعد عام من الدراسة الجادة يدرك كم يجهل. أفاد عالما النفس ديفيد دانينغ وجاستن كروغر بأن ذوي المهارة المتدنية في مهمة ما يميلون إلى المبالغة في تقدير أدائهم، ويعود ذلك جزئيًا إلى أن المهارات اللازمة لإتقان المهمة هي نفسها اللازمة للحكم على إتقانها. غير أن هذا الأثر كثيرًا ما يُضخَّم على الإنترنت، ويرى بعض الباحثين أن جزءًا منه ناتج عن عوامل إحصائية. ومع ذلك يبقى الدرس الجوهري قائمًا: ملاحظات الآخرين تكشف نقاطًا عمياء يغفل عنها التقييم الذاتي."
      },
      takeaway: { en: 'Seek outside feedback; self-assessment has blind spots.', ar: 'اطلب آراء الآخرين، فللتقييم الذاتي نقاط عمياء.' },
      source: { title: 'Wikipedia — Dunning–Kruger effect', url: 'https://en.wikipedia.org/wiki/Dunning%E2%80%93Kruger_effect' },
      quiz: {
        q: { en: 'Why might low-skilled people overestimate their performance?', ar: 'لماذا قد يبالغ ذوو المهارة المتدنية في تقدير أدائهم؟' },
        options: {
          en: ['They are always dishonest', 'They have too much feedback', 'The skills needed to judge a task overlap with the skills to do it'],
          ar: ['لأنهم غير صادقين دائمًا', 'لأنهم يتلقون ملاحظات أكثر من اللازم', 'لأن مهارات الحكم على المهمة تتداخل مع مهارات أدائها']
        },
        answer: 2,
        explain: { en: 'Without the skill, people also lack the ability to see their own mistakes, though the size of the effect is debated.', ar: 'من يفتقر إلى المهارة يفتقر أيضًا إلى القدرة على رؤية أخطائه، وإن كان حجم الأثر محل نقاش.' }
      }
    },
    {
      id: 'pp-10',
      title: { en: 'Sleep and Mood', ar: 'النوم والمزاج' },
      body: {
        en: "After a week of late nights finishing a project, a usually patient nurse snaps at a colleague over a minor mistake and later wonders why she felt so irritable. Research consistently links poor or short sleep with worse mood, greater irritability and weaker emotional control. Sleep deprivation also impairs attention and judgement, sometimes in ways people fail to notice in themselves. The relationship runs both ways: stress and low mood can disrupt sleep, and poor sleep can deepen them. Protecting regular, sufficient sleep is one of the simplest ways to look after both mind and relationships.",
        ar: "بعد أسبوع من السهر لإنهاء مشروع، تنفعل ممرضة صبورة عادةً على زميلة بسبب خطأ بسيط، ثم تتساءل لاحقًا عن سبب سرعة انفعالها. تربط الأبحاث باستمرار بين النوم الرديء أو القصير وسوء المزاج وزيادة الانفعال وضعف التحكم في المشاعر. كما يُضعف الحرمان من النوم الانتباه وحسن التقدير، أحيانًا بطرق لا يلاحظها الناس في أنفسهم. والعلاقة تسير في الاتجاهين: فالتوتر وتدني المزاج قد يربكان النوم، والنوم الرديء قد يعمّقهما. إن الحفاظ على نوم منتظم وكافٍ من أبسط الطرق لرعاية العقل والعلاقات معًا."
      },
      takeaway: { en: 'Guard your sleep; your mood and relationships depend on it.', ar: 'احمِ نومك، فمزاجك وعلاقاتك يعتمدان عليه.' },
      source: { title: 'Wikipedia — Sleep deprivation', url: 'https://en.wikipedia.org/wiki/Sleep_deprivation' },
      quiz: {
        q: { en: 'How are sleep and mood related, according to the card?', ar: 'وفق البطاقة، ما العلاقة بين النوم والمزاج؟' },
        options: {
          en: ['Sleep affects mood, but mood never affects sleep', 'They influence each other in both directions', 'They are completely unrelated'],
          ar: ['النوم يؤثر في المزاج، لكن المزاج لا يؤثر في النوم أبدًا', 'يؤثر كل منهما في الآخر في الاتجاهين', 'لا علاقة بينهما إطلاقًا']
        },
        answer: 1,
        explain: { en: 'Poor sleep worsens mood, and stress or low mood can in turn disrupt sleep.', ar: 'النوم الرديء يُفسد المزاج، والتوتر أو تدني المزاج قد يربك النوم بدوره.' }
      }
    }
  ]
});
