(self.SPARKS_DECKS = self.SPARKS_DECKS || []).push({
  id: 'world-history',
  order: 1,
  emoji: '🌍',
  title: { en: 'World History', ar: 'تاريخ العالم' },
  blurb: { en: 'Turning points that shaped how we live.', ar: 'منعطفات صنعت طريقة عيشنا.' },
  cards: [
    {
      id: 'wh-01',
      title: { en: 'Seeds That Built Cities', ar: 'بذور بنت المدن' },
      body: {
        en: "Picture a farmer beside the Tigris or Euphrates about ten thousand years ago, pressing seeds of wild wheat and barley into soil enriched by floods. Once people could grow more food than they needed, they no longer had to follow the seasons. Villages grew into towns, and by the fourth millennium BCE southern Mesopotamia held some of the first true cities, such as Uruk. Surplus grain fed priests, potters, builders and record keepers who never touched a plough. Canals, temples and city walls followed. Farming did not just change what people ate; it made specialised jobs, organised government and city life possible.",
        ar: "تخيّل مزارعًا على ضفاف دجلة أو الفرات قبل نحو عشرة آلاف عام، يغرس بذور القمح والشعير البرّيين في تربة خصّبتها الفيضانات. حين صار الناس قادرين على إنتاج طعام يفوق حاجتهم، لم يعودوا مضطرين إلى التنقل مع الفصول. فكبرت القرى وصارت بلدات، وبحلول الألف الرابع قبل الميلاد ظهرت في جنوب بلاد الرافدين بعض أولى المدن الحقيقية، مثل أوروك. وأطعم فائض الحبوب كهنةً وخزّافين وبنّائين وكتبةً لم يمسكوا محراثًا قط. ثم جاءت القنوات والمعابد والأسوار. لم تغيّر الزراعة طعام الناس فحسب، بل جعلت المهن المتخصصة والحكم المنظّم وحياة المدن أمرًا ممكنًا."
      },
      takeaway: { en: 'A food surplus from farming made cities and specialised work possible.', ar: 'فائض الغذاء الذي وفّرته الزراعة جعل المدن والمهن المتخصصة ممكنة.' },
      source: { title: 'Wikipedia — Mesopotamia', url: 'https://en.wikipedia.org/wiki/Mesopotamia' },
      quiz: {
        q: { en: 'What allowed early Mesopotamian cities to support priests, builders and scribes who did not farm?', ar: 'ما الذي مكّن مدن بلاد الرافدين الأولى من إعالة كهنة وبنّائين وكتبة لا يعملون في الزراعة؟' },
        options: {
          en: ['Gold mined in nearby hills', 'A surplus of food from farming', 'Tribute paid by distant empires'],
          ar: ['ذهب يُستخرج من التلال القريبة', 'فائض الطعام الناتج عن الزراعة', 'جزية تدفعها إمبراطوريات بعيدة']
        },
        answer: 1,
        explain: { en: 'Farming produced more grain than farmers needed, and that surplus fed people with other specialised jobs.', ar: 'أنتجت الزراعة حبوبًا تزيد على حاجة المزارعين، فأطعم هذا الفائض أصحاب المهن المتخصصة الأخرى.' }
      }
    },
    {
      id: 'wh-02',
      title: { en: 'Wedges in Wet Clay', ar: 'أوتاد على الطين الرطب' },
      body: {
        en: "An archaeologist brushes dirt from a small clay tablet covered in tiny wedge-shaped marks. It is not a poem or a prayer but a receipt: so many sheep, so much barley. In Sumer, toward the end of the fourth millennium BCE, scribes began pressing a cut reed into wet clay to keep track of goods. This script, later called cuneiform, grew from simple tallies into a full writing system. Over some three thousand years it recorded laws, letters, medicine and stories such as the Epic of Gilgamesh, in several languages. Writing began as bookkeeping and became humanity's memory.",
        ar: "ينفض عالم آثار التراب عن لوح طيني صغير مغطى بعلامات دقيقة على شكل أوتاد. ليس قصيدة ولا صلاة، بل إيصال: عدد من الأغنام، وكمية من الشعير. في بلاد سومر، قرب نهاية الألف الرابع قبل الميلاد، بدأ الكتبة يضغطون قصبة مبريّة على الطين الرطب ليسجّلوا البضائع. وهذا الخط، الذي سُمّي لاحقًا بالمسماري، تطوّر من علامات عدّ بسيطة إلى نظام كتابة كامل. وعلى مدى نحو ثلاثة آلاف عام دوّن القوانين والرسائل والطب والحكايات مثل ملحمة جلجامش، وبأكثر من لغة. بدأت الكتابة دفاترَ حسابات، ثم صارت ذاكرة البشرية."
      },
      takeaway: { en: 'Writing was born from record keeping and grew into a tool for law and literature.', ar: 'وُلدت الكتابة من حفظ السجلات ثم صارت أداة للقانون والأدب.' },
      source: { title: 'Wikipedia — Cuneiform', url: 'https://en.wikipedia.org/wiki/Cuneiform' },
      quiz: {
        q: { en: 'What was early cuneiform mainly used for?', ar: 'فيمَ استُخدم الخط المسماري في بداياته أساسًا؟' },
        options: {
          en: ['Keeping records of goods like grain and livestock', 'Writing long religious poems', 'Drawing maps of trade routes'],
          ar: ['تسجيل البضائع كالحبوب والمواشي', 'كتابة قصائد دينية طويلة', 'رسم خرائط طرق التجارة']
        },
        answer: 0,
        explain: { en: 'The earliest tablets are mostly economic records; literature and law came later as the script developed.', ar: 'معظم الألواح الأولى سجلات اقتصادية، أما الأدب والقوانين فجاءت لاحقًا مع تطور الخط.' }
      }
    },
    {
      id: 'wh-03',
      title: { en: 'Who Really Built the Pyramids?', ar: 'من بنى الأهرام حقًا؟' },
      body: {
        en: "For centuries, people imagined the pyramids of Giza rising under the whips of countless slaves. Then archaeologists dug beside the plateau and found something else: a town for workers, with bakeries, breweries, sleeping quarters and tombs where builders were buried with honour near their kings. The Great Pyramid, built for the pharaoh Khufu about four and a half thousand years ago, was the work of organised Egyptian crews, skilled craftsmen and seasonal labourers who were fed and housed by the state. It remained the tallest human-made structure on Earth for thousands of years, a monument to planning as much as to power.",
        ar: "ظلّ الناس قرونًا يتخيّلون أهرام الجيزة ترتفع تحت سياط أعداد لا تُحصى من العبيد. ثم حفر علماء الآثار بجوار الهضبة فوجدوا شيئًا آخر: بلدة للعمّال فيها مخابز وأماكن لتخمير الشعير ومساكن، ومقابر دُفن فيها البنّاؤون بتكريم قرب ملوكهم. فالهرم الأكبر، الذي شُيّد للفرعون خوفو قبل نحو أربعة آلاف وخمسمئة عام، كان من عمل فرق مصرية منظّمة وحرفيين مهرة وعمّال موسميين تكفّلت الدولة بطعامهم ومسكنهم. وبقي أعلى بناء صنعه الإنسان على الأرض آلاف السنين، شاهدًا على حسن التخطيط بقدر ما هو شاهد على القوة."
      },
      takeaway: { en: 'The pyramids show the power of organisation, not just the power of kings.', ar: 'تكشف الأهرام عن قوة التنظيم، لا عن قوة الملوك وحدها.' },
      source: { title: 'Wikipedia — Great Pyramid of Giza', url: 'https://en.wikipedia.org/wiki/Great_Pyramid_of_Giza' },
      quiz: {
        q: { en: 'According to archaeological evidence, who built the Great Pyramid?', ar: 'وفقًا للأدلة الأثرية، من بنى الهرم الأكبر؟' },
        options: {
          en: ['Enslaved foreign captives', 'Engineers sent from Mesopotamia', 'Organised crews of Egyptian workers'],
          ar: ['أسرى أجانب مستعبَدون', 'مهندسون قدموا من بلاد الرافدين', 'فرق منظّمة من العمّال المصريين']
        },
        answer: 2,
        explain: { en: 'Excavations found a town for workers with food production and honourable tombs, pointing to organised, state-supported Egyptian labour.', ar: 'كشفت الحفريات عن بلدة للعمّال فيها إنتاج للطعام ومقابر مكرّمة، مما يدل على عمالة مصرية منظّمة ترعاها الدولة.' }
      }
    },
    {
      id: 'wh-04',
      title: { en: 'Roads of Stone, Rules on Paper', ar: 'طرق من حجر وقوانين مكتوبة' },
      body: {
        en: "A Roman messenger gallops south from the capital along the Appian Way, begun in 312 BCE, its fitted stones still walkable today. Rome eventually laid a vast network of paved roads linking Britain to the Middle East, so that soldiers, traders and news could move faster than ever before. Yet Rome also built something less visible: law. From the early Twelve Tables to the great compilation ordered by the emperor Justinian in the sixth century, Romans wrote down rules about property, contracts and families. Much of continental Europe, and many countries beyond it, still build their civil law on that foundation.",
        ar: "ينطلق رسول روماني على صهوة جواده جنوبًا من العاصمة عبر طريق أبيا، الذي بدأ شقّه عام ثلاثمئة واثني عشر قبل الميلاد، ولا تزال حجارته المرصوفة صالحة للمشي حتى اليوم. وقد مدّت روما في النهاية شبكة واسعة من الطرق المعبّدة تصل بريطانيا بالشرق الأوسط، فصار الجنود والتجّار والأخبار يتنقلون أسرع من أي وقت مضى. لكن روما بنت أيضًا شيئًا أقل ظهورًا: القانون. فمن الألواح الاثني عشر المبكرة إلى المجموعة الكبرى التي أمر بها الإمبراطور جستنيان في القرن السادس، دوّن الرومان قواعد للملكية والعقود والأسرة. ولا تزال دول كثيرة في أوروبا وخارجها تبني قوانينها المدنية على هذا الأساس."
      },
      takeaway: { en: 'Rome connected its empire with roads and organised it with written law.', ar: 'ربطت روما إمبراطوريتها بالطرق ونظّمتها بالقانون المكتوب.' },
      source: { title: 'Wikipedia — Roman roads', url: 'https://en.wikipedia.org/wiki/Roman_roads' },
      quiz: {
        q: { en: 'Which Roman legacy still shapes the civil law of many countries?', ar: 'أيّ إرث روماني لا يزال يؤثر في القوانين المدنية لدول كثيرة؟' },
        options: {
          en: ['Rules for chariot races', 'Roman law as compiled under Justinian', 'The design of Roman coins'],
          ar: ['قواعد سباقات العربات', 'القانون الروماني كما جُمع في عهد جستنيان', 'تصميم العملات الرومانية']
        },
        answer: 1,
        explain: { en: 'Justinian’s compilation preserved Roman rules on property, contracts and family, which later shaped European civil law.', ar: 'حفظت مجموعة جستنيان القواعد الرومانية للملكية والعقود والأسرة، فأثّرت لاحقًا في القوانين المدنية الأوروبية.' }
      }
    },
    {
      id: 'wh-05',
      title: { en: 'More Than Silk on the Silk Road', ar: 'أكثر من حرير على طريق الحرير' },
      body: {
        en: "In the second century BCE, a Chinese envoy named Zhang Qian travelled west and returned with reports of distant kingdoms and their famous horses. His journeys helped open what we now call the Silk Road, which was never one road but a web of routes across deserts, mountains and seas. Few merchants walked the whole way; goods passed from hand to hand in relays. Silk, paper, spices and glass moved along it, but so did ideas. Buddhism spread from India into China, and techniques, foods, art styles and even diseases travelled with the caravans, linking Asia, the Middle East and Europe.",
        ar: "في القرن الثاني قبل الميلاد، سافر مبعوث صيني يُدعى تشانغ تشيان غربًا، وعاد بأخبار عن ممالك بعيدة وخيولها الشهيرة. وأسهمت رحلاته في فتح ما نسميه اليوم طريق الحرير، الذي لم يكن طريقًا واحدًا قط، بل شبكة من المسالك عبر الصحارى والجبال والبحار. قلّة من التجار قطعوا الطريق كله، إذ كانت البضائع تنتقل من يد إلى يد على مراحل. وعبرَه انتقل الحرير والورق والتوابل والزجاج، وانتقلت معها الأفكار أيضًا. فقد انتشرت البوذية من الهند إلى الصين، وسافرت مع القوافل التقنيات والأطعمة وأساليب الفن وحتى الأمراض، فترابطت آسيا والشرق الأوسط وأوروبا."
      },
      takeaway: { en: 'Trade routes carry ideas and beliefs as surely as they carry goods.', ar: 'طرق التجارة تحمل الأفكار والمعتقدات كما تحمل البضائع.' },
      source: { title: 'Wikipedia — Silk Road', url: 'https://en.wikipedia.org/wiki/Silk_Road' },
      quiz: {
        q: { en: 'Besides goods, what else travelled along the Silk Road?', ar: 'إلى جانب البضائع، ماذا انتقل أيضًا عبر طريق الحرير؟' },
        options: {
          en: ['Mostly armies on campaign', 'Nothing but silk', 'Ideas, religions and techniques'],
          ar: ['جيوش في حملات عسكرية غالبًا', 'الحرير وحده لا غير', 'الأفكار والأديان والتقنيات']
        },
        answer: 2,
        explain: { en: 'The routes spread beliefs such as Buddhism along with new techniques, foods and art styles.', ar: 'نشرت هذه الطرق معتقدات كالبوذية إلى جانب تقنيات وأطعمة وأساليب فنية جديدة.' }
      }
    },
    {
      id: 'wh-06',
      title: { en: 'The Plague That Raised Wages', ar: 'الوباء الذي رفع الأجور' },
      body: {
        en: "In 1347, trading ships docked in Sicily carrying sick sailors and something invisible: plague. Within a few years the Black Death had swept across Europe, killing perhaps a third or more of its people. The cause, the bacterium Yersinia pestis, was unknown at the time; it spread through fleas carried by rats and, in some forms, from person to person. Whole villages emptied. Yet the survivors found themselves in a changed world. With so few workers left, labourers could demand higher wages and better terms, and the old feudal bonds between lords and peasants began to loosen.",
        ar: "في عام ألف وثلاثمئة وسبعة وأربعين، رست سفن تجارية في صقلية تحمل بحّارة مرضى وشيئًا لا يُرى: الطاعون. وخلال سنوات قليلة اجتاح الموت الأسود أوروبا، فقضى على ثلث سكانها أو أكثر على الأرجح. ولم يكن سببه معروفًا آنذاك، وهو بكتيريا تنقلها البراغيث التي تحملها الجرذان، وقد تنتقل في بعض أشكالها من إنسان إلى آخر. فرغت قرى بأكملها. لكن الناجين وجدوا أنفسهم في عالم مختلف؛ فمع قلة الأيدي العاملة صار بإمكان العمّال المطالبة بأجور أعلى وشروط أفضل، وبدأت الروابط الإقطاعية القديمة بين الأسياد والفلاحين تضعف."
      },
      takeaway: { en: 'Catastrophes can reshape economies as well as populations.', ar: 'الكوارث قد تعيد تشكيل الاقتصاد لا السكان وحدهم.' },
      source: { title: 'Wikipedia — Black Death', url: 'https://en.wikipedia.org/wiki/Black_Death' },
      quiz: {
        q: { en: 'What was one long-term effect of the Black Death in Europe?', ar: 'ما أحد الآثار البعيدة للموت الأسود في أوروبا؟' },
        options: {
          en: ['Labour shortages that let workers demand higher wages', 'A sudden boom in population', 'A permanent end to sea trade'],
          ar: ['نقص في الأيدي العاملة مكّن العمّال من طلب أجور أعلى', 'طفرة مفاجئة في عدد السكان', 'توقف دائم للتجارة البحرية']
        },
        answer: 0,
        explain: { en: 'So many people died that surviving workers became scarce and could bargain for better pay.', ar: 'مات عدد هائل من الناس فصار العمّال الناجون قلة، وتمكّنوا من المساومة على أجور أفضل.' }
      }
    },
    {
      id: 'wh-07',
      title: { en: 'Gutenberg’s Metal Letters', ar: 'حروف غوتنبرغ المعدنية' },
      body: {
        en: "In a workshop in Mainz around the middle of the fifteenth century, a goldsmith named Johannes Gutenberg arranged small metal letters in a frame, inked them, and pressed paper down with a screw press adapted from winemaking. Movable type had existed earlier in China and Korea, but Gutenberg combined durable metal type, oil-based ink and a press into a fast, repeatable system. His Bible appeared in the 1450s. Before long, printing shops spread across European cities and books became far cheaper. Ideas could now travel in thousands of identical copies, feeding religious debate, science and new readers everywhere.",
        ar: "في ورشة بمدينة ماينتس نحو منتصف القرن الخامس عشر، رصّ صائغ يُدعى يوهانس غوتنبرغ حروفًا معدنية صغيرة في إطار، ثم حبّرها وضغط عليها الورق بمكبس لولبي مقتبس من معاصر النبيذ. كانت الحروف المتحركة معروفة قبله في الصين وكوريا، لكن غوتنبرغ جمع بين حروف معدنية متينة وحبر زيتي ومكبس في نظام سريع قابل للتكرار. وظهر كتابه المقدس المطبوع في خمسينيات ذلك القرن. وسرعان ما انتشرت المطابع في مدن أوروبا وصارت الكتب أرخص بكثير. فأصبحت الأفكار تنتقل في آلاف النسخ المتطابقة، فتغذّي الجدل الديني والعلم وجمهورًا جديدًا من القرّاء."
      },
      takeaway: { en: 'Cheap, identical copies let ideas spread faster than ever before.', ar: 'النسخ الرخيصة المتطابقة جعلت الأفكار تنتشر أسرع من أي وقت مضى.' },
      source: { title: 'Encyclopaedia Britannica — Printing press', url: 'https://www.britannica.com/technology/printing-press' },
      quiz: {
        q: { en: 'What was the heart of Gutenberg’s innovation?', ar: 'ما جوهر ابتكار غوتنبرغ؟' },
        options: {
          en: ['Inventing paper', 'Combining metal movable type, ink and a press', 'Creating the first alphabet'],
          ar: ['اختراع الورق', 'الجمع بين الحروف المعدنية المتحركة والحبر والمكبس', 'ابتكار أول أبجدية']
        },
        answer: 1,
        explain: { en: 'Paper and movable type already existed; Gutenberg’s breakthrough was a practical system combining them with a press.', ar: 'كان الورق والحروف المتحركة موجودين قبله، أما إنجازه فكان نظامًا عمليًا يجمعها مع المكبس.' }
      }
    },
    {
      id: 'wh-08',
      title: { en: 'Potatoes, Horses and the Columbian Exchange', ar: 'البطاطا والخيول والتبادل الكولومبي' },
      body: {
        en: "Imagine Italian cooking without tomatoes, or Irish history without potatoes. Both crops came from the Americas. After Columbus crossed the Atlantic in 1492, plants, animals and people began moving between the hemispheres on a scale never seen before. Maize, potatoes, tomatoes and cacao went east; wheat, sugar cane, horses and cattle went west. Historians call this the Columbian Exchange. It transformed diets and farming on every continent. But it also carried diseases such as smallpox, to which Indigenous peoples of the Americas had no immunity, and epidemics devastated their communities.",
        ar: "تخيّل المطبخ الإيطالي بلا طماطم، أو تاريخ أيرلندا بلا بطاطا. فكلا المحصولين جاء من الأمريكيتين. بعد أن عبر كولومبوس المحيط الأطلسي عام ألف وأربعمئة واثنين وتسعين، بدأت النباتات والحيوانات والبشر تنتقل بين نصفي الكرة الأرضية على نطاق غير مسبوق. فاتجهت الذرة والبطاطا والطماطم والكاكاو شرقًا، واتجه القمح وقصب السكر والخيول والأبقار غربًا. ويسمّي المؤرخون ذلك التبادل الكولومبي. لقد غيّر الغذاء والزراعة في كل القارات، لكنه حمل أيضًا أمراضًا كالجدري لم تكن لدى الشعوب الأصلية في الأمريكيتين مناعة ضدها، فدمّرت الأوبئة مجتمعاتهم."
      },
      takeaway: { en: 'Connecting worlds spreads both great benefits and terrible harms.', ar: 'وصل العوالم ببعضها ينشر منافع عظيمة وأضرارًا فادحة معًا.' },
      source: { title: 'Wikipedia — Columbian exchange', url: 'https://en.wikipedia.org/wiki/Columbian_exchange' },
      quiz: {
        q: { en: 'Which of these crops travelled from the Americas to the rest of the world?', ar: 'أيّ هذه المحاصيل انتقل من الأمريكيتين إلى بقية العالم؟' },
        options: {
          en: ['Wheat', 'Sugar cane', 'Potato'],
          ar: ['القمح', 'قصب السكر', 'البطاطا']
        },
        answer: 2,
        explain: { en: 'Potatoes originated in the Americas, while wheat and sugar cane were carried to the Americas from elsewhere.', ar: 'نشأت البطاطا في الأمريكيتين، أما القمح وقصب السكر فنُقلا إليهما من مناطق أخرى.' }
      }
    },
    {
      id: 'wh-09',
      title: { en: 'Steam Changes Everything', ar: 'البخار يغيّر كل شيء' },
      body: {
        en: "Early steam engines in eighteenth-century Britain were clumsy giants that pumped water out of mines while burning huge amounts of coal. Then an instrument maker in Glasgow, James Watt, was asked to repair a model engine and noticed how much heat it wasted. His separate condenser made steam power far more efficient, and later improvements let engines turn wheels. Factories no longer needed to sit beside rivers. Textile mills multiplied, and in the following century steam locomotives and ships shrank distances. The Industrial Revolution moved millions from farms to cities and changed how humans work and live.",
        ar: "كانت محركات البخار الأولى في بريطانيا خلال القرن الثامن عشر عمالقة ثقيلة الحركة تضخ الماء من المناجم وتحرق كميات هائلة من الفحم. ثم طُلب من صانع أدوات في غلاسكو يُدعى جيمس واط أن يصلح نموذجًا لمحرك، فلاحظ كم يهدر من الحرارة. فجعل المكثّف المنفصل الذي ابتكره طاقة البخار أكثر كفاءة بكثير، ثم مكّنت تحسينات لاحقة المحركات من إدارة العجلات. ولم تعد المصانع مضطرة إلى الإقامة بجوار الأنهار، فتكاثرت مصانع النسيج، وفي القرن التالي قرّبت القاطرات والسفن البخارية المسافات. ونقلت الثورة الصناعية الملايين من الحقول إلى المدن، وغيّرت طريقة عمل البشر وعيشهم."
      },
      takeaway: { en: 'A more efficient engine can reshape where and how people live.', ar: 'محرك أكثر كفاءة قد يعيد تشكيل أماكن عيش الناس وطريقتها.' },
      source: { title: 'Wikipedia — Industrial Revolution', url: 'https://en.wikipedia.org/wiki/Industrial_Revolution' },
      quiz: {
        q: { en: 'What did James Watt’s separate condenser achieve?', ar: 'ماذا حقق المكثّف المنفصل الذي ابتكره جيمس واط؟' },
        options: {
          en: ['It made steam engines far more efficient', 'It replaced coal with electricity', 'It was the first engine ever built'],
          ar: ['جعل محركات البخار أكثر كفاءة بكثير', 'أحلّ الكهرباء محلّ الفحم', 'كان أول محرك يُصنع على الإطلاق']
        },
        answer: 0,
        explain: { en: 'Earlier engines wasted much heat; Watt’s condenser reduced that waste, making steam power practical for industry.', ar: 'كانت المحركات السابقة تهدر حرارة كثيرة، فقلّل مكثّف واط هذا الهدر وجعل البخار عمليًا للصناعة.' }
      }
    },
    {
      id: 'wh-10',
      title: { en: 'A Charter After the War', ar: 'ميثاق بعد الحرب' },
      body: {
        en: "In the spring of 1945, as the Second World War was ending, delegates from fifty countries gathered in San Francisco. Their goal was ambitious: to build an organisation that could prevent another global catastrophe. The earlier League of Nations had failed to stop the slide into war, so they tried again with a new design. They signed the United Nations Charter that June, and the organisation formally came into being in October 1945. Its aims included keeping peace, developing friendly relations among nations, promoting human rights and cooperating on problems such as hunger, health and education.",
        ar: "في ربيع عام ألف وتسعمئة وخمسة وأربعين، ومع اقتراب الحرب العالمية الثانية من نهايتها، اجتمع مندوبون من خمسين دولة في سان فرانسيسكو. كان هدفهم طموحًا: إنشاء منظمة قادرة على منع كارثة عالمية أخرى. فقد عجزت عصبة الأمم من قبل عن وقف الانزلاق نحو الحرب، فحاولوا من جديد بتصميم مختلف. ووقّعوا ميثاق الأمم المتحدة في يونيو من ذلك العام، ثم قامت المنظمة رسميًا في أكتوبر. وشملت أهدافها حفظ السلام، وتنمية العلاقات الودية بين الأمم، وتعزيز حقوق الإنسان، والتعاون في مواجهة مشكلات مثل الجوع والصحة والتعليم."
      },
      takeaway: { en: 'After a world war, nations built a shared forum to try to keep the peace.', ar: 'بعد حرب عالمية، أنشأت الأمم منتدى مشتركًا لمحاولة حفظ السلام.' },
      source: { title: 'Wikipedia — United Nations', url: 'https://en.wikipedia.org/wiki/United_Nations' },
      quiz: {
        q: { en: 'Which earlier organisation did the United Nations follow after it failed to prevent war?', ar: 'أيّ منظمة سابقة خلفتها الأمم المتحدة بعد أن عجزت عن منع الحرب؟' },
        options: {
          en: ['The Red Cross', 'The League of Nations', 'The Roman Senate'],
          ar: ['الصليب الأحمر', 'عصبة الأمم', 'مجلس الشيوخ الروماني']
        },
        answer: 1,
        explain: { en: 'The League of Nations had failed to stop the Second World War, so the United Nations was designed as a fresh attempt.', ar: 'عجزت عصبة الأمم عن منع الحرب العالمية الثانية، فجاءت الأمم المتحدة محاولةً جديدة.' }
      }
    }
  ]
});
