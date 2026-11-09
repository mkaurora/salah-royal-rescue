(self.SPARKS_DECKS = self.SPARKS_DECKS || []).push({
  id: 'islamic-arab-history',
  order: 2,
  emoji: '🕌',
  title: { en: 'Islamic & Arab History', ar: 'التاريخ الإسلامي والعربي' },
  blurb: { en: 'Scholars, cities and journeys that carried knowledge across the world.', ar: 'علماء ومدن ورحلات حملت المعرفة إلى العالم.' },
  cards: [
    {
      id: 'ia-01',
      title: { en: 'Baghdad and the House of Wisdom', ar: 'بغداد وبيت الحكمة' },
      body: {
        en: "In the eighth century, the Abbasid caliph al-Mansur chose a site on the Tigris and built a new capital in the shape of a great circle: Baghdad. Within decades it became one of the largest and richest cities in the world, a crossroads for merchants from India, Persia, Africa and beyond. At its heart grew the House of Wisdom, a royal library and centre of learning that flourished in the ninth century, especially under the caliph al-Ma'mun. There, scholars of different faiths and backgrounds copied, translated and debated books on mathematics, astronomy, medicine and philosophy.",
        ar: "في القرن الثامن الميلادي، اختار الخليفة العباسي أبو جعفر المنصور موقعًا على نهر دجلة، وبنى عاصمة جديدة على هيئة دائرة كبيرة هي بغداد. وخلال عقود قليلة صارت من أكبر مدن العالم وأغناها، وملتقى لتجار قادمين من الهند وفارس وأفريقيا وغيرها. وفي قلبها نما بيت الحكمة، وهو خزانة كتب ملكية ومركز للعلم ازدهر في القرن التاسع، ولا سيما في عهد الخليفة المأمون. وهناك اجتمع علماء من أديان وخلفيات شتى ينسخون الكتب ويترجمونها ويتناقشون في الرياضيات والفلك والطب والفلسفة."
      },
      takeaway: { en: 'Abbasid Baghdad turned a capital city into a global centre of learning.', ar: 'حوّلت بغداد العباسية عاصمة سياسية إلى مركز عالمي للعلم.' },
      source: { title: 'Wikipedia — House of Wisdom', url: 'https://en.wikipedia.org/wiki/House_of_Wisdom' },
      quiz: {
        q: { en: 'What was the House of Wisdom in Abbasid Baghdad?', ar: 'ما بيت الحكمة في بغداد العباسية؟' },
        options: {
          en: ['A royal palace for state ceremonies', 'A market for silk and spices', 'A royal library and centre of learning'],
          ar: ['قصر ملكي للاحتفالات الرسمية', 'سوق للحرير والتوابل', 'خزانة كتب ملكية ومركز للعلم']
        },
        answer: 2,
        explain: { en: 'The House of Wisdom gathered scholars who copied, translated and studied books across many sciences.', ar: 'جمع بيت الحكمة علماء نسخوا الكتب وترجموها ودرسوها في علوم كثيرة.' }
      }
    },
    {
      id: 'ia-02',
      title: { en: 'The Great Translation Movement', ar: 'حركة الترجمة الكبرى' },
      body: {
        en: "Picture a ninth-century physician in Baghdad hunting for old Greek manuscripts of Galen, comparing copies to find the most accurate text. His name was Hunayn ibn Ishaq, a Christian scholar who became one of the most celebrated translators of his age. He was part of a vast effort, supported by caliphs and wealthy patrons, to render works from Greek, Persian, Syriac and Sanskrit into Arabic. Aristotle, Euclid, Ptolemy and Galen all found new readers. Arabic-speaking scholars did not merely preserve these books; they corrected, commented on and extended them. Centuries later, many reached Europe through Latin translations.",
        ar: "تخيّل طبيبًا في بغداد خلال القرن التاسع يبحث عن مخطوطات يونانية قديمة لجالينوس، ويقارن بين نسخها ليصل إلى أدق نص. إنه حنين بن إسحاق، العالم المسيحي الذي صار من أشهر مترجمي عصره. وكان جزءًا من جهد واسع رعاه الخلفاء والأثرياء لنقل الكتب من اليونانية والفارسية والسريانية والسنسكريتية إلى العربية. فوجد أرسطو وإقليدس وبطليموس وجالينوس قرّاءً جددًا. ولم يكتفِ العلماء الناطقون بالعربية بحفظ هذه الكتب، بل صحّحوها وشرحوها وأضافوا إليها. وبعد قرون وصل كثير منها إلى أوروبا عبر ترجمات لاتينية."
      },
      takeaway: { en: 'Translation preserved ancient knowledge and opened the door to new discoveries.', ar: 'حفظت الترجمة علوم الأقدمين وفتحت الباب لاكتشافات جديدة.' },
      source: { title: 'Wikipedia — Hunayn ibn Ishaq', url: 'https://en.wikipedia.org/wiki/Hunayn_ibn_Ishaq' },
      quiz: {
        q: { en: 'What did scholars of the translation movement do with ancient works besides translating them?', ar: 'ماذا فعل علماء حركة الترجمة بالكتب القديمة إلى جانب ترجمتها؟' },
        options: {
          en: ['Corrected, commented on and extended them', 'Locked them away from readers', 'Burned the original manuscripts'],
          ar: ['صحّحوها وشرحوها وأضافوا إليها', 'حجبوها عن القرّاء', 'أحرقوا المخطوطات الأصلية']
        },
        answer: 0,
        explain: { en: 'The movement was not only about preservation; scholars added commentary and new findings to the texts.', ar: 'لم تقتصر الحركة على الحفظ، بل أضاف العلماء شروحًا ونتائج جديدة إلى النصوص.' }
      }
    },
    {
      id: 'ia-03',
      title: { en: 'How Paper Travelled West', ar: 'كيف انتقل الورق غربًا' },
      body: {
        en: "Paper was invented in China, and for centuries its making was little known elsewhere. A famous story says that in the eighth century, Chinese papermakers captured in Central Asia taught the craft in Samarkand. Whatever the exact route, paper mills soon appeared in Baghdad by the end of that century. Paper was cheaper than parchment and easier to produce than papyrus, so it transformed daily life. Government offices kept records on it, booksellers multiplied, and libraries swelled. From the Islamic world the craft passed to al-Andalus and Sicily, and from there into the rest of Europe.",
        ar: "اختُرع الورق في الصين، وبقيت صناعته قرونًا مجهولة في معظم أنحاء العالم. وتقول رواية مشهورة إن صنّاع ورق صينيين أُسروا في آسيا الوسطى خلال القرن الثامن، فعلّموا هذه الحرفة في سمرقند. وأيًّا كان الطريق الدقيق، فقد ظهرت مصانع الورق في بغداد بحلول نهاية ذلك القرن. وكان الورق أرخص من الرَّق وأسهل إنتاجًا من البردي، فغيّر الحياة اليومية؛ إذ دوّنت الدواوين سجلاتها عليه، وتكاثر الورّاقون، وامتلأت المكتبات. ومن العالم الإسلامي انتقلت الصناعة إلى الأندلس وصقلية، ومنهما إلى بقية أوروبا."
      },
      takeaway: { en: 'Cheap paper helped turn the Islamic world into a civilisation of books.', ar: 'ساعد الورق الرخيص على تحويل العالم الإسلامي إلى حضارة كتب.' },
      source: { title: 'Wikipedia — History of paper', url: 'https://en.wikipedia.org/wiki/History_of_paper' },
      quiz: {
        q: { en: 'Why did paper transform learning and government in the Islamic world?', ar: 'لماذا غيّر الورق العلم والإدارة في العالم الإسلامي؟' },
        options: {
          en: ['It lasted longer than stone', 'It was cheaper and easier to produce than parchment or papyrus', 'It was only used for royal decrees'],
          ar: ['لأنه يدوم أطول من الحجر', 'لأنه أرخص وأسهل إنتاجًا من الرَّق والبردي', 'لأنه اقتصر على المراسيم الملكية']
        },
        answer: 1,
        explain: { en: 'Being cheap and easy to make, paper let offices, booksellers and libraries produce far more written material.', ar: 'لأن الورق رخيص وسهل الصنع، أتاح للدواوين والورّاقين والمكتبات إنتاج قدر أكبر بكثير من المكتوب.' }
      }
    },
    {
      id: 'ia-04',
      title: { en: 'Al-Khwarizmi and the Art of Balancing', ar: 'الخوارزمي وفن الموازنة' },
      body: {
        en: "Suppose you must divide an inheritance fairly, but one share is unknown. In ninth-century Baghdad, the scholar al-Khwarizmi, working in the circle of the House of Wisdom, wrote a book showing step by step how to solve such problems. Its title included the word al-jabr, meaning restoring or completing, which gave us the word algebra. He also wrote on the Indian system of numerals, and when his works were translated into Latin, his name was rendered as Algoritmi. From that came the word algorithm: a clear, step-by-step procedure, exactly the method he championed.",
        ar: "لنفترض أنك تريد تقسيم ميراث بالعدل، لكن أحد الأنصبة مجهول. في بغداد خلال القرن التاسع، ألّف العالم الخوارزمي، الذي عمل في محيط بيت الحكمة، كتابًا يشرح خطوة بخطوة كيفية حل مثل هذه المسائل. وتضمّن عنوانه كلمة الجبر، أي الإكمال أو الجبران، ومنها جاءت كلمة الجبر في لغات أوروبا. كما كتب عن نظام الأرقام الهندي، وحين تُرجمت أعماله إلى اللاتينية حُرّف اسمه إلى ما يشبه ألغوريتمي. ومن ذلك جاءت كلمة الخوارزمية: إجراء واضح متسلسل الخطوات، وهو بالضبط المنهج الذي دعا إليه."
      },
      takeaway: { en: 'Both algebra and the algorithm trace their names to al-Khwarizmi.', ar: 'يعود اسما الجبر والخوارزمية كلاهما إلى الخوارزمي.' },
      source: { title: 'Wikipedia — Al-Khwarizmi', url: 'https://en.wikipedia.org/wiki/Al-Khwarizmi' },
      quiz: {
        q: { en: 'Which modern word comes from the Latin form of al-Khwarizmi’s name?', ar: 'أيّ كلمة حديثة اشتُقّت من الصيغة اللاتينية لاسم الخوارزمي؟' },
        options: {
          en: ['Algorithm', 'Almanac', 'Alchemy'],
          ar: ['الخوارزمية', 'التقويم', 'الكيمياء القديمة']
        },
        answer: 0,
        explain: { en: 'His name was rendered in Latin as Algoritmi, which gave rise to the word algorithm.', ar: 'كُتب اسمه باللاتينية بصيغة قريبة من ألغوريتمي، ومنها نشأت كلمة الخوارزمية.' }
      }
    },
    {
      id: 'ia-05',
      title: { en: 'Ibn al-Haytham Tests the Light', ar: 'ابن الهيثم يختبر الضوء' },
      body: {
        en: "Why can we see a lamp across a dark room? Many ancient thinkers believed the eye sent out rays that touched objects. Ibn al-Haytham, a scholar born in Basra who later worked in Cairo around the start of the eleventh century, was not satisfied with arguments alone. He set up experiments with darkened rooms, small openings and beams of light. In his Book of Optics he argued that we see because light travels from objects into the eye. Just as important was his method: state a question, test it with careful experiments, and trust the evidence over authority.",
        ar: "لماذا نرى مصباحًا في الطرف الآخر من غرفة مظلمة؟ اعتقد كثير من مفكري العصور القديمة أن العين تُرسل أشعة تلامس الأشياء. أما ابن الهيثم، العالم المولود في البصرة والذي عمل لاحقًا في القاهرة في مطلع القرن الحادي عشر، فلم يقنع بالجدل النظري وحده. فأجرى تجارب في غرف مظلمة ذات ثقوب صغيرة تنفذ منها حزم الضوء. وفي كتاب المناظر بيّن أننا نرى لأن الضوء ينتقل من الأجسام إلى العين. ولا يقل أهمية عن ذلك منهجه: أن تطرح سؤالًا، وتختبره بتجارب دقيقة، وتقدّم الدليل على أقوال السابقين."
      },
      takeaway: { en: 'Careful experiments, not authority alone, are the path to knowledge.', ar: 'التجربة الدقيقة، لا سلطة الأقوال وحدها، هي طريق المعرفة.' },
      source: { title: 'Wikipedia — Ibn al-Haytham', url: 'https://en.wikipedia.org/wiki/Ibn_al-Haytham' },
      quiz: {
        q: { en: 'According to Ibn al-Haytham’s Book of Optics, how does vision happen?', ar: 'وفقًا لكتاب المناظر لابن الهيثم، كيف تحدث الرؤية؟' },
        options: {
          en: ['The eye sends rays out to objects', 'The mind imagines objects without light', 'Light travels from objects into the eye'],
          ar: ['ترسل العين أشعة إلى الأجسام', 'يتخيّل العقل الأجسام دون ضوء', 'ينتقل الضوء من الأجسام إلى العين']
        },
        answer: 2,
        explain: { en: 'Using experiments with light and small openings, he showed that light enters the eye from objects.', ar: 'بتجارب على الضوء والثقوب الصغيرة، بيّن أن الضوء يدخل العين قادمًا من الأجسام.' }
      }
    },
    {
      id: 'ia-06',
      title: { en: 'Cordoba, Jewel of al-Andalus', ar: 'قرطبة جوهرة الأندلس' },
      body: {
        en: "Step inside the Great Mosque of Cordoba and you meet a forest of columns topped by red and white striped arches. In the tenth century, when Abd al-Rahman the Third declared a caliphate there, Cordoba was among the largest and most cultured cities in Europe, with paved streets, public baths and renowned libraries. Al-Andalus, the Muslim-ruled part of the Iberian Peninsula, became a meeting place where Muslim, Christian and Jewish scholars studied medicine, astronomy and philosophy. Later, translators in cities such as Toledo turned Arabic works into Latin, helping to carry this learning into the rest of Europe.",
        ar: "ادخل المسجد الجامع في قرطبة، فستجد غابة من الأعمدة تعلوها أقواس مخطّطة بالأحمر والأبيض. في القرن العاشر، حين أعلن عبد الرحمن الثالث الخلافة فيها، كانت قرطبة من أكبر مدن أوروبا وأرقاها ثقافة، بشوارعها المرصوفة وحمّاماتها العامة ومكتباتها الشهيرة. وصارت الأندلس، أي الجزء الذي حكمه المسلمون من شبه الجزيرة الإيبيرية، ملتقى يدرس فيه علماء مسلمون ومسيحيون ويهود الطب والفلك والفلسفة. وفي ما بعد نقل مترجمون في مدن مثل طليطلة كتبًا عربية إلى اللاتينية، فأسهموا في حمل هذا العلم إلى بقية أوروبا."
      },
      takeaway: { en: 'Al-Andalus was a bridge that carried learning into Europe.', ar: 'كانت الأندلس جسرًا عبرت عليه العلوم إلى أوروبا.' },
      source: { title: 'Wikipedia — Al-Andalus', url: 'https://en.wikipedia.org/wiki/Al-Andalus' },
      quiz: {
        q: { en: 'How did knowledge from al-Andalus reach the rest of Europe?', ar: 'كيف وصلت علوم الأندلس إلى بقية أوروبا؟' },
        options: {
          en: ['Through Greek merchants in Athens', 'Through Latin translations made in cities like Toledo', 'Through printed books from Cordoba'],
          ar: ['عبر تجار يونانيين في أثينا', 'عبر ترجمات لاتينية أُنجزت في مدن مثل طليطلة', 'عبر كتب مطبوعة في قرطبة']
        },
        answer: 1,
        explain: { en: 'Translators in Toledo and other cities turned Arabic works into Latin, which European scholars could read.', ar: 'نقل المترجمون في طليطلة وغيرها الكتب العربية إلى اللاتينية التي يقرؤها علماء أوروبا.' }
      }
    },
    {
      id: 'ia-07',
      title: { en: 'Ibn Sina’s Canon of Medicine', ar: 'قانون ابن سينا في الطب' },
      body: {
        en: "A gifted young man from near Bukhara was treating patients while still a teenager, according to his own account of his life. Ibn Sina, born in the late tenth century, became both a philosopher and a physician. His greatest medical work, the Canon of Medicine, organised the knowledge of Greek, Persian and Arab medicine into a clear system, adding his own observations on disease, drugs and how to test remedies. Translated into Latin in the twelfth century, the Canon was taught in European universities for centuries, making Ibn Sina, known in Europe as Avicenna, one of history’s most influential doctors.",
        ar: "يروي ابن سينا في سيرته أنه كان يعالج المرضى وهو لا يزال فتى، في بلدة قرب بخارى. وُلد في أواخر القرن العاشر، فصار فيلسوفًا وطبيبًا معًا. وأعظم أعماله الطبية كتاب القانون في الطب، الذي نظّم معارف الطب اليوناني والفارسي والعربي في بناء واضح، وأضاف إليها ملاحظاته عن الأمراض والأدوية وطرق اختبار العلاجات. وقد تُرجم الكتاب إلى اللاتينية في القرن الثاني عشر، وظلّ يُدرَّس في جامعات أوروبا قرونًا، فغدا ابن سينا، المعروف هناك باسم أفيسينا، من أكثر الأطباء تأثيرًا في التاريخ."
      },
      takeaway: { en: 'A well-organised book can shape a whole field for centuries.', ar: 'كتاب حسن التنظيم قد يشكّل علمًا كاملًا لقرون.' },
      source: { title: 'Wikipedia — The Canon of Medicine', url: 'https://en.wikipedia.org/wiki/The_Canon_of_Medicine' },
      quiz: {
        q: { en: 'Why was Ibn Sina’s Canon of Medicine so influential in Europe?', ar: 'لماذا كان لكتاب القانون في الطب لابن سينا هذا الأثر الكبير في أوروبا؟' },
        options: {
          en: ['It was the first book ever written on medicine', 'It was banned, which made it famous', 'It was translated into Latin and taught in universities for centuries'],
          ar: ['لأنه أول كتاب في الطب على الإطلاق', 'لأنه مُنع فاشتهر', 'لأنه تُرجم إلى اللاتينية ودُرّس في الجامعات قرونًا']
        },
        answer: 2,
        explain: { en: 'Its Latin translation made it a standard textbook in European universities for many generations.', ar: 'جعلته ترجمته اللاتينية كتابًا دراسيًا معتمدًا في جامعات أوروبا أجيالًا عديدة.' }
      }
    },
    {
      id: 'ia-08',
      title: { en: 'Ibn Battuta’s Long Road', ar: 'طريق ابن بطوطة الطويل' },
      body: {
        en: "In 1325, a young man from Tangier set out alone to perform the pilgrimage to Mecca. He did not come home for about a quarter of a century. Ibn Battuta crossed North Africa, Arabia and Persia, served as a judge in Delhi and in the Maldives, and reached the coasts of East Africa and China. Later he crossed the Sahara to the empire of Mali. Back in Morocco, he dictated his memories to a scholar, producing a famous travel book known as the Rihla. It remains a priceless window onto the fourteenth-century world, from markets to royal courts.",
        ar: "في عام ألف وثلاثمئة وخمسة وعشرين، خرج شاب من طنجة وحيدًا لأداء فريضة الحج في مكة. ولم يعد إلى بلده إلا بعد نحو ربع قرن. فقد عبر ابن بطوطة شمال أفريقيا والجزيرة العربية وفارس، وتولّى القضاء في دلهي وفي جزر المالديف، وبلغ سواحل شرق أفريقيا والصين. ثم عبر الصحراء الكبرى لاحقًا إلى مملكة مالي. ولما استقر في المغرب أملى ذكرياته على أحد العلماء، فخرج منها كتاب الرحلة الشهير. ولا يزال نافذة لا تُقدّر بثمن على عالم القرن الرابع عشر، من أسواقه إلى بلاطات ملوكه."
      },
      takeaway: { en: 'One traveller’s curiosity preserved a vivid picture of an entire century.', ar: 'فضول رحّالة واحد حفظ صورة نابضة لقرن كامل.' },
      source: { title: 'Wikipedia — Ibn Battuta', url: 'https://en.wikipedia.org/wiki/Ibn_Battuta' },
      quiz: {
        q: { en: 'What first prompted Ibn Battuta to leave Tangier?', ar: 'ما الذي دفع ابن بطوطة أول مرة إلى مغادرة طنجة؟' },
        options: {
          en: ['A job offer in Delhi', 'The pilgrimage to Mecca', 'A trade mission to China'],
          ar: ['عرض عمل في دلهي', 'أداء فريضة الحج في مكة', 'بعثة تجارية إلى الصين']
        },
        answer: 1,
        explain: { en: 'He set out to perform the pilgrimage, and that journey grew into decades of travel.', ar: 'خرج لأداء الحج، ثم امتدت تلك الرحلة إلى عقود من الترحال.' }
      }
    },
    {
      id: 'ia-09',
      title: { en: 'Ibn Khaldun Reads the Rise and Fall', ar: 'ابن خلدون يقرأ النهوض والسقوط' },
      body: {
        en: "Ibn Khaldun, born in Tunis in the fourteenth century, served rulers across North Africa and al-Andalus and watched dynasties rise and collapse. Retreating to a quiet fortress, he began writing a history of the world, but first wrote an introduction, the Muqaddimah. In it he asked why states grow strong and then weaken. His answer centred on asabiyya, the group solidarity that binds people together. Tight-knit groups win power, he argued, but comfort and luxury slowly erode that bond over a few generations. His attention to society, economy and evidence makes many see him as a forerunner of sociology.",
        ar: "وُلد ابن خلدون في تونس في القرن الرابع عشر، وخدم حكّامًا في شمال أفريقيا والأندلس، وشهد دولًا تقوم ثم تنهار. ولما اعتزل في قلعة هادئة، بدأ يكتب تاريخًا للعالم، لكنه كتب أولًا مقدمته الشهيرة. وفيها سأل: لماذا تقوى الدول ثم تضعف؟ وتمحور جوابه حول العصبية، أي التضامن الذي يربط الجماعة بعضها ببعض. فالجماعات المتماسكة تصل إلى الحكم، لكن الترف والدعة يُضعفان هذه الرابطة شيئًا فشيئًا عبر أجيال قليلة. ولاهتمامه بالمجتمع والاقتصاد والدليل، يعدّه كثيرون رائدًا من روّاد علم الاجتماع."
      },
      takeaway: { en: 'History has patterns that careful observation can reveal.', ar: 'للتاريخ أنماط تكشفها الملاحظة المتأنية.' },
      source: { title: 'Wikipedia — Muqaddimah', url: 'https://en.wikipedia.org/wiki/Muqaddimah' },
      quiz: {
        q: { en: 'In the Muqaddimah, what is asabiyya?', ar: 'ما المقصود بالعصبية في مقدمة ابن خلدون؟' },
        options: {
          en: ['The group solidarity that binds people together', 'A tax collected by rulers', 'A style of city architecture'],
          ar: ['التضامن الذي يربط أفراد الجماعة', 'ضريبة يجمعها الحكّام', 'طراز من عمارة المدن']
        },
        answer: 0,
        explain: { en: 'Ibn Khaldun used asabiyya to explain how cohesive groups gain power and lose it as that bond weakens.', ar: 'استخدم ابن خلدون مفهوم العصبية لتفسير صعود الجماعات المتماسكة إلى الحكم ثم فقدانها له حين تضعف تلك الرابطة.' }
      }
    },
    {
      id: 'ia-10',
      title: { en: 'The Long Journey of Our Numbers', ar: 'رحلة أرقامنا الطويلة' },
      body: {
        en: "Try multiplying 347 by 28 using Roman numerals and you will quickly give up. The digits most of the world uses today were born in India, where mathematicians developed a place-value system with a symbol for zero. Scholars in the Islamic world adopted and spread it; al-Khwarizmi wrote a book explaining how to calculate with these Indian numerals. Through translations and trade, the system reached Europe, where it became known as Arabic numerals. In 1202 the Italian mathematician Fibonacci promoted it in his book on calculation, and merchants slowly discovered how much easier their accounts became.",
        ar: "جرّب أن تضرب ثلاثمئة وسبعة وأربعين في ثمانية وعشرين بالأرقام الرومانية، وسرعان ما ستستسلم. فالأرقام التي يستخدمها معظم العالم اليوم وُلدت في الهند، حيث طوّر الرياضيون نظامًا يعتمد على المنزلة العددية ورمزًا للصفر. ثم تبنّاه علماء العالم الإسلامي ونشروه، وألّف الخوارزمي كتابًا يشرح الحساب بهذه الأرقام الهندية. وعبر الترجمات والتجارة وصل النظام إلى أوروبا، فعُرف هناك بالأرقام العربية. وفي عام ألف ومئتين واثنين روّج له الرياضي الإيطالي فيبوناتشي في كتابه عن الحساب، فاكتشف التجار شيئًا فشيئًا كم صارت حساباتهم أيسر."
      },
      takeaway: { en: 'Our everyday digits are a gift passed from India through the Arab world to Europe.', ar: 'أرقامنا اليومية هدية انتقلت من الهند عبر العالم العربي إلى أوروبا.' },
      source: { title: 'Wikipedia — Hindu–Arabic numeral system', url: 'https://en.wikipedia.org/wiki/Hindu%E2%80%93Arabic_numeral_system' },
      quiz: {
        q: { en: 'Where did the place-value numeral system with zero originate?', ar: 'أين نشأ نظام الأرقام القائم على المنزلة العددية والصفر؟' },
        options: {
          en: ['Ancient Rome', 'Medieval Italy', 'India'],
          ar: ['روما القديمة', 'إيطاليا في العصور الوسطى', 'الهند']
        },
        answer: 2,
        explain: { en: 'The system began in India, was spread by scholars in the Islamic world, and later reached Europe as Arabic numerals.', ar: 'نشأ النظام في الهند، ونشره علماء العالم الإسلامي، ثم وصل إلى أوروبا باسم الأرقام العربية.' }
      }
    }
  ]
});
