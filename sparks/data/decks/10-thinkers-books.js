(self.SPARKS_DECKS = self.SPARKS_DECKS || []).push({
  id: "thinkers-books",
  order: 10,
  emoji: "📚",
  title: { en: "Great Thinkers & Books", ar: "مفكرون وكتب عظيمة" },
  blurb: {
    en: "Big ideas from philosophers, scientists and storytellers, explained in plain words.",
    ar: "أفكار كبرى من فلاسفة وعلماء ورواة، بلغة واضحة وبسيطة."
  },
  cards: [
    {
      id: "tb-01",
      title: { en: "Socrates and the Art of Asking", ar: "سقراط وفن السؤال" },
      body: {
        en: "In the marketplace of ancient Athens, a barefoot man stops a confident general and asks him what courage is. The general answers easily. Socrates asks another question, then another, until the general's definition collapses under its own contradictions. Socrates wrote nothing himself; we know him mainly through his student Plato. His method was to examine beliefs through patient questioning, exposing hidden assumptions and pushing people to think more carefully. He claimed that recognising one's own ignorance was the beginning of wisdom. Teachers, lawyers and coaches still use this Socratic method to help others reason their way to clearer understanding.",
        ar: "في سوق أثينا القديمة يستوقف رجلٌ حافي القدمين قائدًا عسكريًا واثقًا ويسأله: ما الشجاعة؟ يجيب القائد بسهولة، فيطرح سقراط سؤالًا آخر ثم آخر، حتى ينهار تعريف القائد تحت تناقضاته. لم يكتب سقراط شيئًا بنفسه، وإنما نعرفه أساسًا من خلال تلميذه أفلاطون. كانت طريقته فحص المعتقدات بالأسئلة الصبورة، وكشف الافتراضات الخفية، ودفع الناس إلى التفكير بعناية أكبر. ورأى أن إدراك المرء لجهله هو بداية الحكمة. وما زال المعلمون والمحامون والمدربون يستخدمون المنهج السقراطي لمساعدة الآخرين على الوصول بعقولهم إلى فهم أوضح."
      },
      takeaway: { en: "Good questions can teach more than ready-made answers.", ar: "السؤال الجيد قد يعلّم أكثر من الإجابة الجاهزة." },
      source: { title: "Stanford Encyclopedia of Philosophy — Socrates", url: "https://plato.stanford.edu/entries/socrates/" },
      quiz: {
        q: { en: "What was at the heart of the Socratic method?", ar: "ما جوهر المنهج السقراطي؟" },
        options: {
          en: ["Writing long books of rules", "Giving speeches to large crowds", "Testing beliefs through careful questioning"],
          ar: ["تأليف كتب طويلة من القواعد", "إلقاء الخطب على حشود كبيرة", "اختبار المعتقدات بالأسئلة الدقيقة"]
        },
        answer: 2,
        explain: {
          en: "Socrates questioned people step by step to reveal contradictions and hidden assumptions.",
          ar: "كان سقراط يسأل الناس خطوة بخطوة ليكشف التناقضات والافتراضات الخفية."
        }
      }
    },
    {
      id: "tb-02",
      title: { en: "Aristotle and the Golden Mean", ar: "أرسطو والوسط الذهبي" },
      body: {
        en: "Imagine two soldiers. One runs at the first sign of danger; the other charges recklessly into certain death. Neither, Aristotle would say, is brave. In his Nicomachean Ethics, he argued that many virtues sit between two vices, one of too little and one of too much. Courage lies between cowardice and rashness; generosity between stinginess and wastefulness. This middle point is not a mathematical average, and it depends on the situation. Finding it takes practical wisdom and practice, much like learning a craft. For Aristotle, good character is built through repeated good actions until they become habits.",
        ar: "تخيّل جنديين: أحدهما يفرّ عند أول بادرة خطر، والآخر يندفع بتهوّر نحو موت محقق. لن يعدّ أرسطو أيًّا منهما شجاعًا. ففي كتابه الأخلاق النيقوماخية رأى أن كثيرًا من الفضائل تقع بين رذيلتين: رذيلة النقص ورذيلة الإفراط. فالشجاعة بين الجبن والتهوّر، والكرم بين البخل والتبذير. وهذا الوسط ليس متوسطًا حسابيًا، بل يتغيّر بحسب الموقف، والوصول إليه يحتاج إلى حكمة عملية ومران، كتعلّم حرفة. فالخُلق الحسن عند أرسطو يُبنى بتكرار الأفعال الحسنة حتى تصير عادات."
      },
      takeaway: { en: "Virtue often lies between two extremes, found through practice and judgement.", ar: "الفضيلة كثيرًا ما تقع بين طرفين، ونبلغها بالمران وحسن التقدير." },
      source: { title: "Stanford Encyclopedia of Philosophy — Aristotle's Ethics", url: "https://plato.stanford.edu/entries/aristotle-ethics/" },
      quiz: {
        q: { en: "According to Aristotle, where does courage lie?", ar: "أين تقع الشجاعة بحسب أرسطو؟" },
        options: {
          en: ["Between cowardice and rashness", "At the extreme of fearlessness", "In avoiding all danger"],
          ar: ["بين الجبن والتهوّر", "في أقصى درجات انعدام الخوف", "في تجنّب كل خطر"]
        },
        answer: 0,
        explain: {
          en: "Aristotle placed courage as the mean between too little boldness and too much.",
          ar: "جعل أرسطو الشجاعة وسطًا بين نقص الجرأة والإفراط فيها."
        }
      }
    },
    {
      id: "tb-03",
      title: { en: "Marcus Aurelius Writes to Himself", ar: "ماركوس أوريليوس يكتب لنفسه" },
      body: {
        en: "Picture the most powerful man in the Roman world, sitting in a cold military camp at night, writing notes meant for no one but himself. Emperor Marcus Aurelius filled these private notebooks, later known as the Meditations, with reminders drawn from Stoic philosophy. A central Stoic idea is to separate what is within our control, such as our judgements, choices and actions, from what is not, such as other people, fame or illness. Peace, the Stoics taught, comes from focusing effort on the first and accepting the second calmly. The notebooks reveal a ruler constantly coaching himself toward patience, duty and humility.",
        ar: "تخيّل أقوى رجل في العالم الروماني جالسًا ليلًا في معسكر عسكري بارد، يكتب ملاحظات لا يقصد بها أحدًا سوى نفسه. ملأ الإمبراطور ماركوس أوريليوس هذه الدفاتر الخاصة، التي عُرفت لاحقًا باسم التأملات، بتذكيرات مستمدة من الفلسفة الرواقية. ومن أفكار الرواقيين المحورية التمييز بين ما يقع في نطاق سيطرتنا، كأحكامنا واختياراتنا وأفعالنا، وما يخرج عنه، كالآخرين والشهرة والمرض. وكانوا يعلّمون أن السكينة تأتي من تركيز الجهد على الأول وتقبّل الثاني بهدوء. وتكشف الدفاتر حاكمًا يدرّب نفسه باستمرار على الصبر والواجب والتواضع."
      },
      takeaway: { en: "Focus on what you can control; meet the rest with calm.", ar: "ركّز على ما تملكه، واستقبل ما سواه بهدوء." },
      source: { title: "Encyclopaedia Britannica — Marcus Aurelius", url: "https://www.britannica.com/biography/Marcus-Aurelius-Roman-emperor" },
      quiz: {
        q: { en: "Which of these is within our control, according to the Stoics?", ar: "أيّ مما يلي يقع في نطاق سيطرتنا بحسب الرواقيين؟" },
        options: {
          en: ["Our fame", "Our own judgements and choices", "Whether we fall ill"],
          ar: ["شهرتنا", "أحكامنا واختياراتنا", "إصابتنا بالمرض"]
        },
        answer: 1,
        explain: {
          en: "Stoics held that our judgements, choices and actions are ours to govern, unlike outside events.",
          ar: "رأى الرواقيون أن أحكامنا واختياراتنا وأفعالنا بأيدينا، بخلاف الأحداث الخارجية."
        }
      }
    },
    {
      id: "tb-04",
      title: { en: "Ibn Rushd, the Great Commentator", ar: "ابن رشد، الشارح الأكبر" },
      body: {
        en: "In twelfth-century Córdoba, a judge and physician spent years working through the difficult texts of Aristotle line by line. Ibn Rushd, known in Europe as Averroes, wrote short summaries, middle-length explanations and long, detailed commentaries on many of Aristotle's works. He also argued that careful philosophical reasoning and religious faith, properly understood, need not conflict. His commentaries were translated into Latin and Hebrew and studied intensely in European universities, where scholars simply called him the Commentator. Through his work, Aristotle's thought re-entered Western learning in a powerful way, showing how ideas travel between cultures.",
        ar: "في قرطبة خلال القرن الثاني عشر الميلادي أمضى قاضٍ وطبيب سنوات يتأمل نصوص أرسطو الصعبة سطرًا سطرًا. كتب ابن رشد، المعروف في أوروبا باسم أفيرّوس، ملخصات قصيرة وشروحًا متوسطة وتفاسير مطوّلة مفصّلة لكثير من مؤلفات أرسطو. ودافع أيضًا عن أن النظر الفلسفي الدقيق والإيمان الديني، إذا فُهما فهمًا صحيحًا، لا يتعارضان بالضرورة. وتُرجمت شروحه إلى اللاتينية والعبرية، ودُرست بعمق في جامعات أوروبا، حيث لقّبه العلماء بالشارح. وبفضل عمله عاد فكر أرسطو بقوة إلى الدرس الغربي، في مثال حيّ على انتقال الأفكار بين الثقافات."
      },
      takeaway: { en: "Ideas cross cultures: Ibn Rushd helped carry Aristotle into European thought.", ar: "الأفكار تعبر الثقافات، وابن رشد حمل أرسطو إلى الفكر الأوروبي." },
      source: { title: "Stanford Encyclopedia of Philosophy — Ibn Rushd", url: "https://plato.stanford.edu/entries/ibn-rushd/" },
      quiz: {
        q: { en: "Why was Ibn Rushd called the Commentator in Europe?", ar: "لماذا لُقّب ابن رشد بالشارح في أوروبا؟" },
        options: {
          en: ["For his detailed commentaries on Aristotle", "For his history of Córdoba", "For his books of poetry"],
          ar: ["لشروحه المفصّلة على أرسطو", "لكتابه في تاريخ قرطبة", "لدواوينه الشعرية"]
        },
        answer: 0,
        explain: {
          en: "His explanations of Aristotle's works were so influential that European scholars named him simply the Commentator.",
          ar: "كانت شروحه لمؤلفات أرسطو مؤثرة إلى حد أن علماء أوروبا لقّبوه بالشارح."
        }
      }
    },
    {
      id: "tb-05",
      title: { en: "Al-Ghazali's Search for Certainty", ar: "الغزالي والبحث عن اليقين" },
      body: {
        en: "Imagine a celebrated professor in Baghdad, admired by students, who suddenly finds he cannot speak in class. Al-Ghazali, one of the most influential scholars in Islamic history, described a deep crisis of doubt. He asked what he could know with complete certainty. Even the senses can deceive, he noted, as when a distant star looks tiny though it is vast. He examined theology, philosophy and other schools of thought in turn. Eventually he left his prestigious post, travelled for years, and found his answer in spiritual practice and inner experience. He later recorded this intellectual journey in a famous autobiographical work.",
        ar: "تخيّل أستاذًا مرموقًا في بغداد يعجب به طلابه، ثم يجد نفسه فجأة عاجزًا عن الكلام في درسه. لقد وصف الغزالي، وهو من أعظم العلماء أثرًا في التاريخ الإسلامي، أزمة شكّ عميقة مرّ بها. تساءل: ما الذي يمكنني معرفته بيقين تام؟ ولاحظ أن الحواس نفسها قد تخدع، كما يبدو النجم البعيد صغيرًا مع أنه هائل الحجم. فدرس علم الكلام والفلسفة ومذاهب فكرية أخرى واحدًا تلو الآخر. ثم ترك منصبه الرفيع وارتحل سنوات، ووجد جوابه في التجربة الروحية والسلوك الباطني. ودوّن هذه الرحلة الفكرية لاحقًا في كتاب شهير يروي فيه سيرته."
      },
      takeaway: { en: "Honest doubt can be the start of a deeper search for truth.", ar: "الشك الصادق قد يكون بداية بحث أعمق عن الحقيقة." },
      source: { title: "Stanford Encyclopedia of Philosophy — al-Ghazali", url: "https://plato.stanford.edu/entries/al-ghazali/" },
      quiz: {
        q: { en: "What example did al-Ghazali use to show the senses can mislead?", ar: "ما المثال الذي استخدمه الغزالي ليبيّن أن الحواس قد تخدع؟" },
        options: {
          en: ["A stick bending in water", "An echo in a valley", "A distant star that looks tiny but is vast"],
          ar: ["عصا تبدو منكسرة في الماء", "صدى الصوت في الوادي", "نجم بعيد يبدو صغيرًا وهو هائل"]
        },
        answer: 2,
        explain: {
          en: "He pointed out that a star appears small to the eye even though it is in fact enormous.",
          ar: "أشار إلى أن النجم يبدو للعين صغيرًا مع أنه في الحقيقة ضخم جدًا."
        }
      }
    },
    {
      id: "tb-06",
      title: { en: "Descartes Doubts Everything", ar: "ديكارت يشكّ في كل شيء" },
      body: {
        en: "A seventeenth-century French thinker sits by a warm stove and sets himself a strange task: to doubt everything that could possibly be doubted. René Descartes reasoned that his senses sometimes fooled him, that dreams can feel real, and that he might even be deceived by some powerful trickster. Could anything survive? Yes, he concluded: the very act of doubting proved that he, the one doing the doubting, must exist as a thinking thing. From this single firm foundation, he tried to rebuild knowledge step by step. His method of systematic doubt helped shape modern philosophy and the spirit of scientific inquiry.",
        ar: "يجلس مفكر فرنسي من القرن السابع عشر قرب مدفأة دافئة، ويضع لنفسه مهمة غريبة: أن يشكّ في كل ما يمكن الشك فيه. رأى رينيه ديكارت أن حواسه خدعته أحيانًا، وأن الأحلام قد تبدو حقيقية، بل ربما يخدعه مخادع قوي. فهل يصمد شيء؟ نعم، كما خلص: ففعل الشك ذاته يثبت أنه هو، الذي يشكّ، موجود بوصفه كائنًا يفكر. ومن هذا الأساس الراسخ الوحيد حاول أن يعيد بناء المعرفة خطوة بعد خطوة. وأسهم منهجه في الشك المنظّم في تشكيل الفلسفة الحديثة وروح البحث العلمي."
      },
      takeaway: { en: "Doubting carefully can reveal what you can truly rely on.", ar: "الشك المنهجي قد يكشف ما يمكن الاعتماد عليه حقًا." },
      source: { title: "Stanford Encyclopedia of Philosophy — Descartes' Epistemology", url: "https://plato.stanford.edu/entries/descartes-epistemology/" },
      quiz: {
        q: { en: "What did Descartes find he could not doubt?", ar: "ما الذي وجد ديكارت أنه لا يستطيع الشك فيه؟" },
        options: {
          en: ["That his senses are always accurate", "That he exists as a thinking thing", "That dreams are never real"],
          ar: ["أن حواسه دقيقة دائمًا", "أنه موجود بوصفه كائنًا يفكر", "أن الأحلام ليست حقيقية أبدًا"]
        },
        answer: 1,
        explain: {
          en: "The act of doubting itself showed that a thinker doing the doubting must exist.",
          ar: "فعل الشك نفسه دلّ على وجود مفكر يقوم بهذا الشك."
        }
      }
    },
    {
      id: "tb-07",
      title: { en: "Adam Smith and the Pin Factory", ar: "آدم سميث ومصنع الدبابيس" },
      body: {
        en: "Making a simple pin sounds easy. Yet Adam Smith, the Scottish thinker, opened his 1776 book The Wealth of Nations by describing a pin workshop in surprising detail. One worker on his own, doing every step, might make very few pins in a day. But when the job is split into many small tasks, one drawing the wire, another straightening it, another cutting, another sharpening, a small team can produce enormous numbers. Specialising builds skill, saves time switching between tasks and encourages better tools. This division of labour, Smith argued, is a major source of rising productivity and national wealth.",
        ar: "صنع دبوس بسيط يبدو أمرًا سهلًا. ومع ذلك افتتح المفكر الاسكتلندي آدم سميث كتابه ثروة الأمم، الصادر عام ١٧٧٦، بوصف مفصّل لورشة دبابيس. فالعامل الذي يؤدي كل الخطوات وحده قد لا يصنع إلا عددًا قليلًا جدًا في اليوم. أما إذا قُسّم العمل إلى مهام صغيرة كثيرة، فواحد يسحب السلك، وآخر يقوّمه، وثالث يقطعه، ورابع يشحذ طرفه، فإن فريقًا صغيرًا ينتج أعدادًا هائلة. فالتخصص ينمّي المهارة، ويوفر وقت التنقل بين المهام، ويشجع على ابتكار أدوات أفضل. ورأى سميث أن تقسيم العمل هذا مصدر رئيسي لارتفاع الإنتاجية وثروة الأمم."
      },
      takeaway: { en: "Splitting work into specialised tasks can multiply what people produce.", ar: "تقسيم العمل إلى مهام متخصصة يضاعف ما ينتجه الناس." },
      source: { title: "Wikipedia — The Wealth of Nations", url: "https://en.wikipedia.org/wiki/The_Wealth_of_Nations" },
      quiz: {
        q: { en: "What did Smith use the pin factory to illustrate?", ar: "ما الذي أراد سميث توضيحه بمثال مصنع الدبابيس؟" },
        options: {
          en: ["The dangers of factory work", "Why pins should be cheaper", "How division of labour boosts productivity"],
          ar: ["مخاطر العمل في المصانع", "لماذا يجب أن تكون الدبابيس أرخص", "كيف يرفع تقسيم العمل الإنتاجية"]
        },
        answer: 2,
        explain: {
          en: "Splitting pin-making into specialised steps let a small team produce far more than workers alone.",
          ar: "تقسيم صناعة الدبوس إلى خطوات متخصصة مكّن فريقًا صغيرًا من إنتاج أكثر بكثير من العمال منفردين."
        }
      }
    },
    {
      id: "tb-08",
      title: { en: "Darwin's Long Argument", ar: "حجة داروين الطويلة" },
      body: {
        en: "Returning from a five-year voyage aboard HMS Beagle, the young naturalist Charles Darwin puzzled over finches, tortoises and fossils he had collected. Why did related species differ from island to island? For two decades he gathered evidence before publishing On the Origin of Species in 1859. His central idea was natural selection: individuals vary, many more are born than can survive, and those with traits better suited to their surroundings tend to leave more offspring. Over vast stretches of time, these small differences can accumulate into new species. The book transformed biology and remains the foundation of modern evolutionary science.",
        ar: "عاد العالم الطبيعي الشاب تشارلز داروين من رحلة استمرت خمس سنوات على متن السفينة بيغل، وظلّ يتأمل الطيور والسلاحف والأحافير التي جمعها. لماذا تختلف الأنواع المتقاربة من جزيرة إلى أخرى؟ أمضى نحو عقدين يجمع الأدلة قبل أن ينشر كتابه أصل الأنواع عام ١٨٥٩. وكانت فكرته المحورية الانتقاء الطبيعي: الأفراد يتفاوتون، ويولد منهم أكثر بكثير مما يمكن أن يبقى، ومن يحملون صفات أنسب لبيئتهم يميلون إلى ترك نسل أكبر. ومع امتداد الزمن الطويل قد تتراكم هذه الفروق الصغيرة لتنشأ أنواع جديدة. وقد غيّر الكتاب علم الأحياء، وما زال أساس علم التطور الحديث."
      },
      takeaway: { en: "Small inherited differences, filtered over time, can reshape life.", ar: "الفروق الموروثة الصغيرة، مع الزمن والانتقاء، قد تعيد تشكيل الحياة." },
      source: { title: "Wikipedia — On the Origin of Species", url: "https://en.wikipedia.org/wiki/On_the_Origin_of_Species" },
      quiz: {
        q: { en: "What is the central mechanism in Darwin's book?", ar: "ما الآلية المحورية في كتاب داروين؟" },
        options: {
          en: ["Natural selection", "Inheritance of learned skills", "Sudden creation of species on islands"],
          ar: ["الانتقاء الطبيعي", "توريث المهارات المكتسبة", "نشوء الأنواع فجأة على الجزر"]
        },
        answer: 0,
        explain: {
          en: "Darwin argued that individuals with better-suited traits leave more offspring, gradually changing species.",
          ar: "رأى داروين أن الأفراد ذوي الصفات الأنسب يتركون نسلًا أكبر، فتتغير الأنواع تدريجيًا."
        }
      }
    },
    {
      id: "tb-09",
      title: { en: "Kahneman's Two Systems of Thinking", ar: "كانمان ونظاما التفكير" },
      body: {
        en: "Try this puzzle: a bat and a ball cost a total of one dollar and ten cents, and the bat costs one dollar more than the ball. How much is the ball? Most people instantly think ten cents, but the right answer is five. Psychologist Daniel Kahneman, a Nobel laureate in economics, used puzzles like this in his book Thinking, Fast and Slow. He described two modes of thought. System 1 is fast, automatic and intuitive; System 2 is slow, effortful and deliberate. System 1 serves us well most of the time but can lead to predictable errors when we fail to check it.",
        ar: "جرّب هذا اللغز: مضرب وكرة ثمنهما معًا دولار وعشرة سنتات، والمضرب أغلى من الكرة بدولار واحد. فكم ثمن الكرة؟ يجيب معظم الناس فورًا: عشرة سنتات، لكن الصواب خمسة. استخدم عالم النفس دانيال كانمان، الحائز جائزة نوبل في الاقتصاد، ألغازًا كهذه في كتابه التفكير السريع والبطيء. ووصف فيه نمطين للتفكير: النظام الأول سريع وتلقائي وحدسي، والنظام الثاني بطيء يتطلب جهدًا ويعمل بتأنٍّ. يخدمنا النظام الأول جيدًا في أغلب الأحيان، لكنه قد يوقعنا في أخطاء متوقعة حين لا نراجعه."
      },
      takeaway: { en: "When a quick answer feels obvious, it may be worth a slow second look.", ar: "حين تبدو الإجابة السريعة بديهية، قد تستحق نظرة ثانية متأنية." },
      source: { title: "Wikipedia — Thinking, Fast and Slow", url: "https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow" },
      quiz: {
        q: { en: "Which system is described as slow, effortful and deliberate?", ar: "أيّ نظام يوصف بأنه بطيء ويتطلب جهدًا ومتأنٍّ؟" },
        options: {
          en: ["System 1", "System 2", "Both equally"],
          ar: ["النظام الأول", "النظام الثاني", "كلاهما بالتساوي"]
        },
        answer: 1,
        explain: {
          en: "System 2 is the careful, effortful mode; System 1 is fast and intuitive.",
          ar: "النظام الثاني هو النمط المتأني الذي يتطلب جهدًا، أما الأول فسريع وحدسي."
        }
      }
    },
    {
      id: "tb-10",
      title: { en: "Kalila wa Dimna: Wisdom Told by Animals", ar: "كليلة ودمنة: حكمة على ألسنة الحيوان" },
      body: {
        en: "A clever jackal schemes to win favour at the lion's court, and a tortoise who cannot keep quiet loses everything. These are the kinds of tales found in Kalila wa Dimna, a collection of animal fables named after two jackals. Its roots lie in an ancient Indian collection, the Panchatantra, which passed into Middle Persian and was then rendered into Arabic prose in the eighth century by Ibn al-Muqaffa. The stories nest inside one another and teach lessons about friendship, trust, deception and good rule. From Arabic, the book spread into many languages and became one of the most widely travelled works of world literature.",
        ar: "ابن آوى ماكر يدبّر الحيل لينال الحظوة في بلاط الأسد، وسلحفاة لا تستطيع السكوت فتخسر كل شيء. هذه نماذج من الحكايات التي يضمها كتاب كليلة ودمنة، وهو مجموعة من الخرافات على ألسنة الحيوان سُمّيت باسم اثنين من بنات آوى. تعود جذوره إلى مجموعة هندية قديمة تُعرف بالبانشاتانترا، انتقلت إلى الفارسية الوسطى، ثم نقلها ابن المقفع إلى نثر عربي بديع في القرن الثامن الميلادي. تتداخل القصص بعضها في بعض، وتعلّم دروسًا في الصداقة والثقة والخداع وحسن الحكم. ومن العربية انتشر الكتاب إلى لغات كثيرة، فصار من أوسع أعمال الأدب العالمي انتشارًا."
      },
      takeaway: { en: "Simple animal stories can carry deep lessons across centuries and cultures.", ar: "حكايات الحيوان البسيطة قد تحمل دروسًا عميقة عبر القرون والثقافات." },
      source: { title: "Wikipedia — Kalila and Dimna", url: "https://en.wikipedia.org/wiki/Kalila_and_Dimna" },
      quiz: {
        q: { en: "Who rendered Kalila wa Dimna into Arabic prose?", ar: "من نقل كليلة ودمنة إلى النثر العربي؟" },
        options: {
          en: ["Ibn Rushd", "Al-Ghazali", "Ibn al-Muqaffa"],
          ar: ["ابن رشد", "الغزالي", "ابن المقفع"]
        },
        answer: 2,
        explain: {
          en: "Ibn al-Muqaffa translated the work from Middle Persian into Arabic in the eighth century.",
          ar: "ترجم ابن المقفع الكتاب من الفارسية الوسطى إلى العربية في القرن الثامن الميلادي."
        }
      }
    }
  ]
});
