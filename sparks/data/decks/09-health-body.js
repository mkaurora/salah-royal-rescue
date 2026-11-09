(self.SPARKS_DECKS = self.SPARKS_DECKS || []).push({
  id: "health-body",
  order: 9,
  emoji: "🩺",
  title: { en: "Health & Body", ar: "الصحة والجسم" },
  blurb: {
    en: "How your body works, and the discoveries that changed medicine. General education, not medical advice.",
    ar: "كيف يعمل جسمك، والاكتشافات التي غيّرت الطب. معرفة عامة وليست نصيحة طبية."
  },
  cards: [
    {
      id: "hb-01",
      title: { en: "What Sleep Does While You Are Away", ar: "ماذا يفعل النوم في غيابك؟" },
      body: {
        en: "A student crams all night, then blanks in the exam. Another studies, sleeps, and remembers more. Sleep is not simply switching off. During deep sleep and dreaming sleep, the brain appears to replay and strengthen the day's memories, moving some from fragile short-term storage into more lasting form. Researchers have also proposed a cleaning role: studies in mice suggest fluid flows more freely through the brain during sleep, possibly washing away waste products. This so-called glymphatic idea is promising but still being tested in humans. What is clear is that regular, sufficient sleep supports learning, mood and health.",
        ar: "طالب يسهر الليل كله في المراجعة ثم ينسى كل شيء في الامتحان، وآخر يذاكر ثم ينام فيتذكر أكثر. النوم ليس مجرد انطفاء. ففي مراحل النوم العميق ونوم الأحلام يبدو أن الدماغ يعيد تشغيل ذكريات اليوم ويقوّيها، فينقل بعضها من مخزن قصير هشّ إلى صورة أكثر ثباتًا. ويقترح باحثون أيضًا دورًا تنظيفيًا: إذ تشير دراسات على الفئران إلى أن السائل يتدفق في الدماغ بسهولة أكبر أثناء النوم، وربما يجرف الفضلات. هذه الفكرة المعروفة بالجهاز الغليمفاوي واعدة لكنها ما زالت قيد الاختبار لدى البشر. أما الثابت فهو أن النوم المنتظم الكافي يدعم التعلم والمزاج والصحة."
      },
      takeaway: { en: "Sleep is active work: it helps lock in what you learned.", ar: "النوم عمل نشط يساعد على تثبيت ما تعلمته." },
      source: { title: "Wikipedia — Sleep and memory", url: "https://en.wikipedia.org/wiki/Sleep_and_memory" },
      quiz: {
        q: { en: "Which role of sleep is described as still being tested in humans?", ar: "أيّ أدوار النوم وُصف بأنه ما زال قيد الاختبار لدى البشر؟" },
        options: {
          en: ["Strengthening memories", "Washing waste from the brain", "Supporting mood"],
          ar: ["تقوية الذكريات", "جرف الفضلات من الدماغ", "دعم المزاج"]
        },
        answer: 1,
        explain: {
          en: "The glymphatic cleaning idea comes mainly from mouse studies and is still being investigated in people.",
          ar: "فكرة التنظيف الغليمفاوي مصدرها أساسًا دراسات على الفئران، وما زالت قيد البحث لدى البشر."
        }
      }
    },
    {
      id: "hb-02",
      title: { en: "Harvey and the Heart as a Pump", ar: "هارفي والقلب بوصفه مضخة" },
      body: {
        en: "In the early 1600s, the English physician William Harvey did a simple sum that upset centuries of teaching. Many believed blood was made continuously in the liver and consumed by the body. Harvey estimated how much blood the heart pushes out with each beat, multiplied by the beats in an hour, and got far more than a person could possibly eat and drink. The blood must be going round and round. Through careful dissections and experiments with veins and valves, he showed that the heart is a muscular pump driving blood in a closed circuit through arteries and back through veins.",
        ar: "في مطلع القرن السابع عشر أجرى الطبيب الإنجليزي ويليام هارفي حسابًا بسيطًا هزّ تعاليم قرون. كان كثيرون يعتقدون أن الدم يُصنع باستمرار في الكبد ثم يستهلكه الجسم. قدّر هارفي كمية الدم التي يدفعها القلب في كل نبضة، وضربها في عدد النبضات خلال ساعة، فخرج برقم يفوق بكثير ما يمكن لإنسان أن يأكله ويشربه. إذن لا بد أن الدم يدور ويعود. وبتشريحات دقيقة وتجارب على الأوردة وصماماتها، بيّن أن القلب مضخة عضلية تدفع الدم في دائرة مغلقة عبر الشرايين، ثم يعود عبر الأوردة."
      },
      takeaway: { en: "A careful estimate can overturn a long-held belief.", ar: "تقدير حسابي دقيق قد يقلب اعتقادًا راسخًا." },
      source: { title: "Encyclopaedia Britannica — William Harvey", url: "https://www.britannica.com/biography/William-Harvey" },
      quiz: {
        q: { en: "What convinced Harvey that blood must circulate?", ar: "ما الذي أقنع هارفي بأن الدم لا بد أن يدور؟" },
        options: {
          en: ["The heart pumps far more blood than the body could make from food", "Blood changes colour in the liver", "Patients felt their pulse slow down at night"],
          ar: ["القلب يضخ دمًا أكثر بكثير مما يمكن أن يصنعه الجسم من الطعام", "الدم يتغير لونه في الكبد", "المرضى شعروا بتباطؤ النبض ليلًا"]
        },
        answer: 0,
        explain: {
          en: "His estimate of blood pumped per hour was far too large to be newly made, so the same blood had to return.",
          ar: "كان تقديره لكمية الدم المضخوخة في الساعة أكبر من أن يُصنع من جديد، فلا بد أن الدم نفسه يعود."
        }
      }
    },
    {
      id: "hb-03",
      title: { en: "How Vaccines Train Your Immune System", ar: "كيف تدرّب اللقاحات جهاز المناعة" },
      body: {
        en: "Imagine a guard shown a wanted poster before the thief ever arrives. That is roughly what a vaccine does. It presents the immune system with a harmless version or piece of a germ, such as a weakened or inactivated microbe, a single protein, or instructions for making one. The body responds by producing antibodies and, importantly, memory cells. If the real germ appears later, those memory cells recognise it and mount a faster, stronger defence, often preventing serious illness. When enough people in a community are protected, it also becomes harder for an infection to spread to those who cannot be vaccinated.",
        ar: "تخيّل حارسًا تُعرض عليه صورة اللص قبل أن يصل. هذا تقريبًا ما يفعله اللقاح. فهو يقدّم لجهاز المناعة نسخة غير ضارة من الجرثومة أو جزءًا منها، كميكروب مُضعَف أو معطَّل، أو بروتين واحد، أو تعليمات لصنع ذلك البروتين. فيستجيب الجسم بإنتاج أجسام مضادة، والأهم من ذلك خلايا ذاكرة. وإذا ظهرت الجرثومة الحقيقية لاحقًا تتعرّف عليها هذه الخلايا وتطلق دفاعًا أسرع وأقوى، فتمنع في الغالب المرض الشديد. وحين يتمتع عدد كافٍ من أفراد المجتمع بالحماية، يصعب على العدوى أن تنتقل إلى من لا يستطيعون تلقي اللقاح."
      },
      takeaway: { en: "A vaccine is a rehearsal that lets immunity respond faster to the real threat.", ar: "اللقاح تدريب مسبق يجعل المناعة أسرع أمام الخطر الحقيقي." },
      source: { title: "World Health Organization — Vaccines and immunization", url: "https://www.who.int/health-topics/vaccines-and-immunization" },
      quiz: {
        q: { en: "What lets the body respond faster when the real germ arrives?", ar: "ما الذي يمكّن الجسم من الاستجابة بسرعة أكبر عند وصول الجرثومة الحقيقية؟" },
        options: {
          en: ["Higher body temperature", "Extra red blood cells", "Memory cells formed after vaccination"],
          ar: ["ارتفاع حرارة الجسم", "زيادة خلايا الدم الحمراء", "خلايا الذاكرة التي تكوّنت بعد التطعيم"]
        },
        answer: 2,
        explain: {
          en: "Vaccination leaves behind memory cells that recognise the germ and trigger a quicker, stronger defence.",
          ar: "يترك التطعيم خلايا ذاكرة تتعرّف على الجرثومة وتطلق دفاعًا أسرع وأقوى."
        }
      }
    },
    {
      id: "hb-04",
      title: { en: "The Crowded World Inside Your Gut", ar: "العالم المزدحم داخل أمعائك" },
      body: {
        en: "Your intestines are home to a vast community of bacteria, fungi and other microbes, known together as the gut microbiome. Far from being mere passengers, many of them help break down fibre the body cannot digest alone, produce certain vitamins and useful compounds, and train the immune system. Scientists are now exploring links between the microbiome and conditions ranging from digestive problems to mood. This field is young and exciting, but much remains uncertain: many findings show associations rather than proven cause and effect. A varied diet rich in plant fibre is widely considered a sensible way to support these tiny partners.",
        ar: "تعيش في أمعائك جماعة هائلة من البكتيريا والفطريات وكائنات دقيقة أخرى، تُعرف معًا باسم ميكروبيوم الأمعاء. وهي ليست مجرد ركاب عابرين، فكثير منها يساعد على تفكيك الألياف التي لا يستطيع الجسم هضمها وحده، وينتج بعض الفيتامينات ومركبات مفيدة، ويسهم في تدريب جهاز المناعة. ويدرس العلماء اليوم صلات محتملة بين الميكروبيوم وحالات تمتد من مشكلات الهضم إلى المزاج. لكن هذا المجال حديث، وكثير من نتائجه يكشف ارتباطًا لا سببية مثبتة. ويُعدّ النظام الغذائي المتنوع الغني بالألياف النباتية طريقة معقولة لدعم هؤلاء الشركاء الصغار."
      },
      takeaway: { en: "Your gut microbes are partners, but the science on them is still emerging.", ar: "ميكروبات أمعائك شركاء، لكن العلم حولها ما زال في بداياته." },
      source: { title: "Wikipedia — Gut microbiota", url: "https://en.wikipedia.org/wiki/Gut_microbiota" },
      quiz: {
        q: { en: "Why should claims about the microbiome be treated with some caution?", ar: "لماذا ينبغي التعامل بحذر مع الادعاءات حول الميكروبيوم؟" },
        options: {
          en: ["Gut microbes are always harmful", "Many findings show associations, not proven causes", "The microbiome has never been studied"],
          ar: ["ميكروبات الأمعاء ضارة دائمًا", "كثير من النتائج يُظهر ارتباطًا لا سببية مثبتة", "الميكروبيوم لم يُدرس قط"]
        },
        answer: 1,
        explain: {
          en: "The field is young, and a link between two things does not prove that one causes the other.",
          ar: "المجال حديث، ووجود ارتباط بين أمرين لا يثبت أن أحدهما يسبب الآخر."
        }
      }
    },
    {
      id: "hb-05",
      title: { en: "Why Muscles Need Resistance as We Age", ar: "لماذا تحتاج العضلات إلى المقاومة مع التقدم في العمر" },
      body: {
        en: "Picture two grandparents. One struggles to rise from a low chair; the other stands up easily and carries the shopping home. Part of the difference may be muscle. From middle age onward, people tend to lose muscle mass and strength gradually, a process called sarcopenia when it becomes significant. Weaker muscles can make falls, frailty and loss of independence more likely. The encouraging news is that muscle responds to challenge at almost any age. Resistance exercise, such as lifting weights, using bands or bodyweight moves, can slow the decline and rebuild strength. Anyone with health conditions should ask a clinician how to start safely.",
        ar: "تخيّل جدّين: أحدهما يجد صعوبة في النهوض من كرسي منخفض، والآخر يقف بسهولة ويحمل مشترياته إلى البيت. قد يكون جزء من الفرق هو العضلات. فابتداءً من منتصف العمر يميل الناس إلى فقدان الكتلة العضلية والقوة تدريجيًا، وتُسمّى هذه العملية حين تصبح ملحوظة ضمورَ العضلات المرتبط بالعمر. والعضلات الضعيفة قد تزيد احتمال السقوط والوهن وفقدان الاستقلالية. والخبر المشجع أن العضلات تستجيب للتحدي في أي عمر تقريبًا، فتمارين المقاومة كرفع الأثقال أو الأشرطة المطاطية أو تمارين وزن الجسم يمكن أن تبطئ التراجع وتعيد بناء القوة. ومن لديه حالة صحية فليسأل طبيبه عن طريقة آمنة للبدء."
      },
      takeaway: { en: "Muscle can be rebuilt at almost any age if you give it resistance.", ar: "يمكن بناء العضلات في أي عمر تقريبًا إذا منحتها المقاومة." },
      source: { title: "Wikipedia — Sarcopenia", url: "https://en.wikipedia.org/wiki/Sarcopenia" },
      quiz: {
        q: { en: "What does the card say about muscle loss with age?", ar: "ماذا تقول البطاقة عن فقدان العضلات مع العمر؟" },
        options: {
          en: ["It cannot be changed once it starts", "It only affects professional athletes", "Resistance exercise can slow it and rebuild strength"],
          ar: ["لا يمكن تغييره بعد أن يبدأ", "لا يصيب إلا الرياضيين المحترفين", "تمارين المقاومة يمكن أن تبطئه وتعيد بناء القوة"]
        },
        answer: 2,
        explain: {
          en: "Muscle responds to challenge at almost any age, so resistance training helps counter sarcopenia.",
          ar: "تستجيب العضلات للتحدي في أي عمر تقريبًا، لذا تساعد تمارين المقاومة على مواجهة ضمور العضلات."
        }
      }
    },
    {
      id: "hb-06",
      title: { en: "Hydration Without the Myths", ar: "شرب الماء بعيدًا عن الخرافات" },
      body: {
        en: "A hiker on a hot afternoon starts to feel a headache, dizziness and unusual tiredness. Her body is short of water. Water makes up a large share of the human body and is needed to regulate temperature, carry nutrients and remove waste through urine. Needs vary widely with climate, activity, body size and health, which is why a single magic number can mislead. Thirst is a useful guide for most healthy people, and pale yellow urine is a common sign of being well hydrated. Food and other drinks count too. Older adults, young children and people who are ill may need extra attention.",
        ar: "متنزّهة في ظهيرة حارة تبدأ تشعر بصداع ودوار وتعب غير معتاد، فجسمها ينقصه الماء. يشكّل الماء جزءًا كبيرًا من جسم الإنسان، ويحتاج إليه الجسم لتنظيم الحرارة ونقل المغذيات والتخلص من الفضلات عبر البول. وتختلف الحاجة إليه كثيرًا بحسب المناخ والنشاط وحجم الجسم والحالة الصحية، ولهذا قد يضلّل رقم سحري واحد. فالعطش دليل مفيد لمعظم الأصحاء، ولون البول الأصفر الفاتح علامة شائعة على ترطيب جيد. والطعام والمشروبات الأخرى تُحتسب أيضًا. أما كبار السن والأطفال الصغار والمرضى فقد يحتاجون إلى عناية إضافية."
      },
      takeaway: { en: "Water needs vary; thirst and urine colour are practical everyday guides.", ar: "الحاجة إلى الماء تختلف، والعطش ولون البول دليلان عمليان." },
      source: { title: "Wikipedia — Dehydration", url: "https://en.wikipedia.org/wiki/Dehydration" },
      quiz: {
        q: { en: "According to the card, why can one fixed daily water number mislead?", ar: "بحسب البطاقة، لماذا قد يضلّل رقم ثابت واحد لكمية الماء اليومية؟" },
        options: {
          en: ["Needs vary with climate, activity, body size and health", "Water is not needed on cool days", "Only plain water counts towards hydration"],
          ar: ["الحاجة تختلف بحسب المناخ والنشاط وحجم الجسم والصحة", "لا حاجة إلى الماء في الأيام الباردة", "الماء الصافي وحده يُحتسب في الترطيب"]
        },
        answer: 0,
        explain: {
          en: "Because needs differ between people and situations, thirst and urine colour are better everyday guides.",
          ar: "لأن الحاجة تختلف بين الناس والظروف، فالعطش ولون البول دليلان يوميان أفضل."
        }
      }
    },
    {
      id: "hb-07",
      title: { en: "Sunlight and the Vitamin Your Skin Makes", ar: "ضوء الشمس والفيتامين الذي يصنعه جلدك" },
      body: {
        en: "In the industrial cities of nineteenth-century Europe, many children grew up with soft, bent bones, a disease called rickets. Smoke-filled skies and long indoor hours were part of the story. We now know that skin makes vitamin D when exposed to ultraviolet B rays in sunlight, and the body needs vitamin D to absorb calcium and keep bones strong. People with darker skin, those who cover most of their skin, older adults and anyone who rarely goes outside may make less. Some foods and supplements provide it too. Too much sun raises skin cancer risk, so a clinician can advise on balance.",
        ar: "في المدن الصناعية بأوروبا خلال القرن التاسع عشر نشأ كثير من الأطفال بعظام لينة مقوّسة، وهو مرض يُعرف بالكساح. وكان للسماء المليئة بالدخان وطول البقاء داخل المباني دور في ذلك. ونعلم اليوم أن الجلد يصنع فيتامين د عند تعرّضه للأشعة فوق البنفسجية من النوع ب في ضوء الشمس، وأن الجسم يحتاج إلى هذا الفيتامين لامتصاص الكالسيوم والحفاظ على قوة العظام. وقد يصنع منه قدرًا أقل أصحابُ البشرة الداكنة، ومن يغطّون معظم أجسامهم، وكبار السن، ومن نادرًا ما يخرجون. وتوفّره أيضًا بعض الأطعمة والمكمّلات. لكن الإفراط في الشمس يزيد خطر سرطان الجلد، والطبيب أقدر على تقدير التوازن المناسب."
      },
      takeaway: { en: "Sunlight helps your skin make vitamin D, which bones need to use calcium.", ar: "ضوء الشمس يساعد جلدك على صنع فيتامين د الذي تحتاجه العظام." },
      source: { title: "Wikipedia — Vitamin D", url: "https://en.wikipedia.org/wiki/Vitamin_D" },
      quiz: {
        q: { en: "Why does the body need vitamin D?", ar: "لماذا يحتاج الجسم إلى فيتامين د؟" },
        options: {
          en: ["To digest fibre", "To absorb calcium for strong bones", "To make red blood cells"],
          ar: ["لهضم الألياف", "لامتصاص الكالسيوم من أجل عظام قوية", "لصنع خلايا الدم الحمراء"]
        },
        answer: 1,
        explain: {
          en: "Vitamin D helps the body absorb calcium; without enough, bones can soften, as in rickets.",
          ar: "يساعد فيتامين د الجسم على امتصاص الكالسيوم، ونقصه قد يليّن العظام كما في الكساح."
        }
      }
    },
    {
      id: "hb-08",
      title: { en: "The Stress Response: Built for Sprints", ar: "استجابة التوتر: مصمَّمة للعدو السريع" },
      body: {
        en: "A car swerves toward you and, before you can think, you leap back with a pounding heart. That is the fight-or-flight response. The brain signals the adrenal glands to release adrenaline, which quickens the heartbeat and breathing and sends energy to the muscles. Cortisol, another stress hormone, follows and helps keep fuel available. This system is brilliant for short emergencies. The trouble comes when worries about work, money or relationships keep it switched on for weeks. Long-running stress is linked to poor sleep and other health problems. Rest, movement, connection and, when needed, professional help can ease the load.",
        ar: "سيارة تنحرف نحوك، وقبل أن تفكر تقفز إلى الخلف وقلبك يخفق بشدة. هذه هي استجابة الكرّ أو الفرّ. يرسل الدماغ إشارة إلى الغدتين الكظريتين فتفرزان الأدرينالين، فيتسارع النبض والتنفس وتتدفق الطاقة إلى العضلات. ثم يتبعه الكورتيزول، وهو هرمون توتر آخر يساعد على إبقاء الوقود متاحًا. هذا النظام رائع في الطوارئ القصيرة، لكن المشكلة تبدأ حين تُبقيه هموم العمل أو المال أو العلاقات مشتعلًا لأسابيع. فالتوتر المزمن يرتبط بقلة النوم ومشكلات صحية أخرى. والراحة والحركة والتواصل مع الآخرين، والمساعدة المتخصصة عند الحاجة، كلها تخفف العبء."
      },
      takeaway: { en: "The stress response is meant for short bursts, not to stay on for weeks.", ar: "استجابة التوتر وُجدت للحظات قصيرة لا لتبقى مشتعلة أسابيع." },
      source: { title: "Wikipedia — Fight-or-flight response", url: "https://en.wikipedia.org/wiki/Fight-or-flight_response" },
      quiz: {
        q: { en: "When does the stress response become a problem, according to the card?", ar: "متى تصبح استجابة التوتر مشكلة بحسب البطاقة؟" },
        options: {
          en: ["When it reacts to a sudden danger", "When it releases adrenaline at all", "When ongoing worries keep it switched on for weeks"],
          ar: ["حين تتفاعل مع خطر مفاجئ", "حين تفرز الأدرينالين أصلًا", "حين تُبقيها الهموم المستمرة مشتعلة لأسابيع"]
        },
        answer: 2,
        explain: {
          en: "The system suits brief emergencies; staying activated for long periods is linked to health problems.",
          ar: "النظام مناسب للطوارئ القصيرة، أما بقاؤه نشطًا مدة طويلة فيرتبط بمشكلات صحية."
        }
      }
    },
    {
      id: "hb-09",
      title: { en: "Fleming's Mould and the Limits of Antibiotics", ar: "عفن فليمنغ وحدود المضادات الحيوية" },
      body: {
        en: "In 1928, Alexander Fleming returned from a holiday to find mould growing on one of his bacterial plates in London. Around the mould, the bacteria had died. That mould produced penicillin, which others later purified into a life-saving medicine. Antibiotics work by attacking structures and processes that bacteria have, such as their cell walls. Viruses, which cause colds and flu, are built very differently and multiply inside our own cells, so antibiotics do not touch them. Taking antibiotics when they are not needed can cause side effects and helps bacteria evolve resistance. A clinician can judge whether an infection is likely bacterial.",
        ar: "عام ١٩٢٨ عاد ألكسندر فليمنغ من إجازة إلى مختبره في لندن فوجد عفنًا نما على أحد أطباق البكتيريا، ولاحظ أن البكتيريا حول العفن قد ماتت. كان ذلك العفن ينتج البنسلين، الذي نقّاه علماء آخرون لاحقًا ليصبح دواءً منقذًا للحياة. تعمل المضادات الحيوية بمهاجمة تراكيب وعمليات تملكها البكتيريا، مثل جدرانها الخلوية. أما الفيروسات المسببة للزكام والإنفلونزا فبنيتها مختلفة تمامًا، وتتكاثر داخل خلايانا نفسها، فلا تؤثر فيها المضادات الحيوية. وتناولها دون حاجة قد يسبب آثارًا جانبية ويساعد البكتيريا على تطوير مقاومة. والطبيب هو من يقدّر إن كانت العدوى بكتيرية على الأرجح."
      },
      takeaway: { en: "Antibiotics fight bacteria, not viruses like colds and flu.", ar: "المضادات الحيوية تحارب البكتيريا لا فيروسات الزكام والإنفلونزا." },
      source: { title: "NHS — Antibiotics", url: "https://www.nhs.uk/conditions/antibiotics/" },
      quiz: {
        q: { en: "Why do antibiotics not cure a common cold?", ar: "لماذا لا تعالج المضادات الحيوية الزكام؟" },
        options: {
          en: ["Colds are caused by viruses, which antibiotics do not target", "Colds are caused by mould", "The cold virus is already resistant to every medicine"],
          ar: ["الزكام سببه فيروسات لا تستهدفها المضادات الحيوية", "الزكام سببه العفن", "فيروس الزكام مقاوم لكل الأدوية أصلًا"]
        },
        answer: 0,
        explain: {
          en: "Antibiotics attack bacterial structures; viruses are built differently and live inside our cells.",
          ar: "تهاجم المضادات الحيوية تراكيب البكتيريا، أما الفيروسات فبنيتها مختلفة وتعيش داخل خلايانا."
        }
      }
    },
    {
      id: "hb-10",
      title: { en: "Semmelweis and the Power of Clean Hands", ar: "زيملفايس وقوة الأيدي النظيفة" },
      body: {
        en: "In a Vienna hospital in the 1840s, a young doctor named Ignaz Semmelweis faced a puzzle. Women giving birth in the ward run by doctors died of fever far more often than those in the ward run by midwives. He noticed that doctors often came straight from performing autopsies. When he required them to wash their hands in a chlorine solution, deaths dropped sharply. Many colleagues rejected his idea, partly because germ theory had not yet been established. Today, handwashing with soap and water is recognised as one of the simplest, cheapest ways to prevent the spread of infection.",
        ar: "في أحد مستشفيات فيينا خلال أربعينيات القرن التاسع عشر واجه طبيب شاب يُدعى إغناتس زيملفايس لغزًا: النساء اللواتي يلدن في الجناح الذي يديره الأطباء يمتن بحمى النفاس أكثر بكثير من نظيراتهن في جناح القابلات. ولاحظ أن الأطباء كثيرًا ما يأتون مباشرة من تشريح الجثث. وحين ألزمهم بغسل أيديهم بمحلول الكلور انخفضت الوفيات انخفاضًا حادًا. ومع ذلك رفض كثير من زملائه فكرته، ويعود ذلك جزئيًا إلى أن نظرية الجراثيم لم تكن قد ترسخت بعد. واليوم يُعدّ غسل اليدين بالماء والصابون من أبسط الوسائل وأقلها كلفة لمنع انتشار العدوى."
      },
      takeaway: { en: "Washing your hands is a small act with a huge protective effect.", ar: "غسل اليدين فعل صغير بأثر وقائي كبير." },
      source: { title: "Encyclopaedia Britannica — Ignaz Semmelweis", url: "https://www.britannica.com/biography/Ignaz-Semmelweis" },
      quiz: {
        q: { en: "What did Semmelweis introduce that sharply reduced deaths?", ar: "ما الذي أدخله زيملفايس فخفّض الوفيات بشدة؟" },
        options: {
          en: ["Separate wards for midwives", "Handwashing in a chlorine solution", "A new vaccine for fever"],
          ar: ["أجنحة منفصلة للقابلات", "غسل الأيدي بمحلول الكلور", "لقاحًا جديدًا للحمى"]
        },
        answer: 1,
        explain: {
          en: "Requiring doctors to wash their hands in chlorine after autopsies cut the fever deaths dramatically.",
          ar: "إلزام الأطباء بغسل أيديهم بالكلور بعد التشريح خفّض وفيات الحمى خفضًا كبيرًا."
        }
      }
    }
  ]
});
