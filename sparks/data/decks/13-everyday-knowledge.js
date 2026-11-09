(self.SPARKS_DECKS = self.SPARKS_DECKS || []).push({
  id: "everyday-knowledge",
  order: 13,
  emoji: "💡",
  title: { en: "Everyday Knowledge", ar: "معرفة يومية" },
  blurb: {
    en: "The hidden science behind ordinary moments in kitchens, streets and pockets.",
    ar: "العلم الخفي وراء لحظات عادية في المطبخ والشارع والجيب."
  },
  cards: [
    {
      id: "ek-01",
      title: { en: "Why Onions Make You Cry", ar: "لماذا يبكينا البصل؟" },
      body: {
        en: "A cook slices an onion and, within seconds, is blinking back tears. The onion is defending itself. Its cells store sulfur compounds and, separately, an enzyme. When a knife breaks the cells, the two mix, and a chain of reactions produces a volatile gas that drifts upward. When it reaches the eyes, it irritates nerves there, and the eyes respond by flooding with tears to wash it away. Tricks that help include chilling the onion first, which slows the gas, using a very sharp knife that crushes fewer cells, and cutting near good ventilation.",
        ar: "يقطّع طاهٍ بصلة، وخلال ثوانٍ يجد نفسه يغالب الدموع. إن البصلة تدافع عن نفسها. فخلاياها تخزن مركبات كبريتية، وتخزن في مكان منفصل إنزيمًا خاصًا. وحين تكسر السكين الخلايا يختلط الاثنان، فتنتج سلسلة من التفاعلات غازًا متطايرًا يصعد إلى الأعلى. وعندما يصل إلى العينين يهيّج الأعصاب فيهما، فتستجيبان بإفراز الدموع لغسله. ومن الحيل المفيدة تبريد البصلة أولًا لإبطاء خروج الغاز، واستخدام سكين حادة جدًا تسحق خلايا أقل، والتقطيع في مكان جيد التهوية."
      },
      takeaway: {
        en: "Cutting onions releases an irritating gas that makes your eyes flush it with tears.",
        ar: "تقطيع البصل يطلق غازًا مهيّجًا فتغسله العينان بالدموع."
      },
      source: { title: "Wikipedia — Syn-Propanethial-S-oxide", url: "https://en.wikipedia.org/wiki/Syn-Propanethial-S-oxide" },
      quiz: {
        q: { en: "Why does chilling an onion before cutting help?", ar: "لماذا يفيد تبريد البصلة قبل تقطيعها؟" },
        options: { en: ["It removes the sulfur", "It slows the release of the irritating gas", "It makes the eyes less sensitive"], ar: ["لأنه يزيل الكبريت", "لأنه يبطئ انطلاق الغاز المهيّج", "لأنه يقلل حساسية العينين"] },
        answer: 1,
        explain: {
          en: "Cold slows the chemical reactions and evaporation, so less gas reaches your eyes.",
          ar: "البرودة تبطئ التفاعلات والتبخر، فيصل إلى العينين غاز أقل."
        }
      }
    },
    {
      id: "ek-02",
      title: { en: "How a Microwave Heats Food", ar: "كيف يسخّن الميكروويف الطعام؟" },
      body: {
        en: "A student reheats leftover rice and finds the edges scalding while the middle is still cold. The reason lies in how a microwave works. Inside, a device called a magnetron produces microwaves, a type of radio wave. Their electric field flips back and forth billions of times per second, and water molecules, which have a positive and a negative end, keep twisting to follow it. That jostling turns into heat. The waves penetrate only a few centimetres, so the centre of a thick dish warms mainly by heat spreading inward. That is why stirring and resting the food help.",
        ar: "يعيد طالب تسخين أرز متبقٍ، فيجد أطرافه شديدة السخونة بينما وسطه ما زال باردًا. والسبب في طريقة عمل الميكروويف. ففي داخله جهاز يُسمى المغنيترون ينتج موجات دقيقة، وهي نوع من الموجات الراديوية. ينقلب مجالها الكهربائي ذهابًا وإيابًا مليارات المرات في الثانية، وجزيئات الماء، التي لها طرف موجب وآخر سالب، تظل تلتف لتتبعه. وهذا الاهتزاز يتحول إلى حرارة. ولا تخترق الموجات سوى بضعة سنتيمترات، فيسخن وسط الطبق السميك غالبًا بانتقال الحرارة إليه تدريجيًا. لهذا يفيد تقليب الطعام وتركه قليلًا."
      },
      takeaway: {
        en: "Microwaves make water molecules twist rapidly, and that motion becomes heat.",
        ar: "تجعل الموجات الدقيقة جزيئات الماء تلتف بسرعة، فتتحول حركتها إلى حرارة."
      },
      source: { title: "Wikipedia — Microwave oven", url: "https://en.wikipedia.org/wiki/Microwave_oven" },
      quiz: {
        q: { en: "Why can the middle of a thick dish stay cold in a microwave?", ar: "لماذا قد يبقى وسط الطبق السميك باردًا في الميكروويف؟" },
        options: { en: ["Microwaves penetrate only a few centimetres", "Microwaves only heat metal", "The magnetron turns off halfway"], ar: ["لأن الموجات لا تخترق إلا بضعة سنتيمترات", "لأن الموجات لا تسخّن إلا المعادن", "لأن المغنيترون يتوقف في منتصف الوقت"] },
        answer: 0,
        explain: {
          en: "The waves heat the outer layers directly; the centre warms more slowly as heat spreads inward.",
          ar: "تسخّن الموجات الطبقات الخارجية مباشرة، بينما يسخن الوسط ببطء بانتقال الحرارة إليه."
        }
      }
    },
    {
      id: "ek-03",
      title: { en: "The Secret of Stale Bread", ar: "سرّ الخبز اليابس" },
      body: {
        en: "A baker notices something odd: a loaf left out for a day turns hard, yet a few minutes in a warm oven makes it soft again. If staling were just drying out, that would not work. The real culprit is starch. During baking, starch granules absorb water and their molecules loosen into a soft gel. As the bread cools and sits, those molecules slowly line up again into firm, crystal-like structures, a process called starch retrogradation. Gentle reheating breaks the order up for a while. Oddly, the refrigerator speeds staling, while freezing nearly stops it.",
        ar: "يلاحظ خبّاز أمرًا غريبًا: رغيف تُرك يومًا يصبح قاسيًا، لكن بضع دقائق في فرن دافئ تعيد إليه طراوته. ولو كان اليباس مجرد جفاف لما نجحت هذه الحيلة. فالسبب الحقيقي هو النشا. أثناء الخَبز تمتص حبيبات النشا الماء وتتفكك جزيئاتها إلى هلام طري. ومع برود الخبز وبقائه تعود هذه الجزيئات ببطء إلى الاصطفاف في بنى صلبة شبه بلورية، وتُسمى هذه العملية ارتداد النشا. والتسخين اللطيف يفكك هذا الترتيب مؤقتًا. والعجيب أن الثلاجة تسرّع اليباس، بينما يكاد التجميد يوقفه."
      },
      takeaway: {
        en: "Bread goes stale mainly because starch recrystallises, not just because it dries.",
        ar: "ييبس الخبز أساسًا لأن النشا يعود للتبلور، لا لمجرد الجفاف."
      },
      source: { title: "Wikipedia — Staling", url: "https://en.wikipedia.org/wiki/Staling" },
      quiz: {
        q: { en: "Where does bread go stale fastest?", ar: "أين ييبس الخبز بأسرع ما يمكن؟" },
        options: { en: ["In the freezer", "In a warm oven", "In the refrigerator"], ar: ["في المجمّد", "في فرن دافئ", "في الثلاجة"] },
        answer: 2,
        explain: {
          en: "Refrigerator temperatures speed starch retrogradation, while freezing nearly halts it.",
          ar: "تسرّع حرارة الثلاجة ارتداد النشا، بينما يكاد التجميد يوقفه."
        }
      }
    },
    {
      id: "ek-04",
      title: { en: "Why Ice Floats", ar: "لماذا يطفو الجليد؟" },
      body: {
        en: "Drop a cube of ice into a glass and it bobs at the top. That seems ordinary, but it is unusual. Most substances are denser as solids than as liquids, so their solid form sinks. Water is different. When it freezes, hydrogen bonds lock its molecules into an open, hexagonal lattice that takes up more space than liquid water. Ice is therefore less dense and floats. This matters enormously: in winter, lakes freeze from the top down, and the ice layer insulates the water below, letting fish and other life survive until spring.",
        ar: "ألقِ مكعب ثلج في كأس وسيطفو على السطح. يبدو ذلك عاديًا، لكنه في الحقيقة استثنائي. فمعظم المواد تكون أكثف في حالتها الصلبة منها في حالتها السائلة، فيغوص صلبها. أما الماء فمختلف؛ فعندما يتجمد تثبّت الروابط الهيدروجينية جزيئاته في شبكة سداسية مفتوحة تشغل حيزًا أكبر من الماء السائل. لذلك يكون الجليد أقل كثافة فيطفو. ولهذا أهمية بالغة: ففي الشتاء تتجمد البحيرات من الأعلى إلى الأسفل، وتعزل طبقة الجليد الماء تحتها، فتبقى الأسماك والكائنات الأخرى حية حتى الربيع."
      },
      takeaway: {
        en: "Ice floats because freezing water forms an open lattice that is less dense.",
        ar: "يطفو الجليد لأن الماء المتجمد يشكل شبكة مفتوحة أقل كثافة."
      },
      source: { title: "Wikipedia — Ice", url: "https://en.wikipedia.org/wiki/Ice" },
      quiz: {
        q: { en: "Why is ice less dense than liquid water?", ar: "لماذا الجليد أقل كثافة من الماء السائل؟" },
        options: { en: ["It contains trapped air bubbles", "Its molecules form an open hexagonal lattice", "It is made of lighter molecules"], ar: ["لأنه يحتوي على فقاعات هواء محبوسة", "لأن جزيئاته تشكل شبكة سداسية مفتوحة", "لأنه مكوّن من جزيئات أخف"] },
        answer: 1,
        explain: {
          en: "Hydrogen bonds hold the molecules in an open structure that takes up more space.",
          ar: "تثبّت الروابط الهيدروجينية الجزيئات في بنية مفتوحة تشغل حيزًا أكبر."
        }
      }
    },
    {
      id: "ek-05",
      title: { en: "How Your Phone Knows Where You Are", ar: "كيف يعرف هاتفك مكانك؟" },
      body: {
        en: "A hiker checks a phone deep in a forest, far from any cell tower, and still sees a blue dot on the map. GPS works by timing. Satellites orbiting high above carry extremely precise atomic clocks and constantly broadcast signals saying where they are and exactly when each signal was sent. A receiver notes when each signal arrives; since radio waves travel at the speed of light, the delay reveals the distance to each satellite. With signals from at least four satellites, the receiver can work out its position and correct its own less accurate clock.",
        ar: "يتفقد متنزّه هاتفه في عمق غابة بعيدًا عن أي برج اتصالات، ومع ذلك يرى نقطة زرقاء على الخريطة. يعمل نظام تحديد المواقع العالمي بالتوقيت. فالأقمار الصناعية التي تدور عاليًا تحمل ساعات ذرية بالغة الدقة، وتبث باستمرار إشارات تحدد موقعها واللحظة الدقيقة التي أُرسلت فيها كل إشارة. ويسجل جهاز الاستقبال لحظة وصول كل إشارة، ولأن الموجات الراديوية تسير بسرعة الضوء فإن التأخير يكشف المسافة إلى كل قمر. وبإشارات من أربعة أقمار على الأقل يستطيع الجهاز تحديد موقعه وتصحيح ساعته الأقل دقة."
      },
      takeaway: {
        en: "GPS turns signal travel times from several satellites into a position.",
        ar: "يحوّل نظام تحديد المواقع زمن وصول إشارات عدة أقمار إلى موقع."
      },
      source: { title: "Wikipedia — Global Positioning System", url: "https://en.wikipedia.org/wiki/Global_Positioning_System" },
      quiz: {
        q: { en: "How does a GPS receiver find its distance to a satellite?", ar: "كيف يحدد جهاز الاستقبال بُعده عن القمر الصناعي؟" },
        options: { en: ["By measuring the signal travel time", "By connecting to the nearest cell tower", "By measuring the signal colour"], ar: ["بقياس زمن انتقال الإشارة", "بالاتصال بأقرب برج اتصالات", "بقياس لون الإشارة"] },
        answer: 0,
        explain: {
          en: "Signals travel at the speed of light, so the delay between sending and arrival gives the distance.",
          ar: "تسير الإشارات بسرعة الضوء، فيكشف التأخير بين الإرسال والوصول المسافة."
        }
      }
    },
    {
      id: "ek-06",
      title: { en: "How Soap Grabs Grease", ar: "كيف يمسك الصابون بالدهون؟" },
      body: {
        en: "After a greasy meal, someone rinses a pan under hot water, and the oily film just slides around. Add a drop of soap and it lifts away. The trick is in the soap molecule's split personality. One end is attracted to water; the other, a long oily tail, avoids water but mixes happily with fats. When you scrub, the tails bury themselves in grease while the heads face outward, forming tiny spheres called micelles that wrap the oil inside. The water can then carry these packages away. The same action helps soap break apart the fatty outer layer of many germs.",
        ar: "بعد وجبة دسمة يشطف أحدهم مقلاة تحت الماء الساخن، فتنزلق طبقة الزيت دون أن تزول. لكن قطرة صابون تكفي لرفعها. والسر في الطبيعة المزدوجة لجزيء الصابون؛ فأحد طرفيه ينجذب إلى الماء، والآخر ذيل دهني طويل ينفر من الماء ويمتزج بسهولة مع الدهون. وعند الفرك تنغرس الذيول في الدهون بينما تتجه الرؤوس إلى الخارج، فتتكون كريات دقيقة تُسمى المذيلات تحيط بالزيت. ثم يحمل الماء هذه الحزم بعيدًا. والآلية نفسها تساعد الصابون على تفكيك الغلاف الدهني لكثير من الجراثيم."
      },
      takeaway: {
        en: "Soap molecules trap grease inside micelles that water can rinse away.",
        ar: "تحبس جزيئات الصابون الدهون داخل مذيلات يستطيع الماء جرفها."
      },
      source: { title: "Wikipedia — Soap", url: "https://en.wikipedia.org/wiki/Soap" },
      quiz: {
        q: { en: "What part of a soap molecule sticks to grease?", ar: "أي جزء من جزيء الصابون يلتصق بالدهون؟" },
        options: { en: ["The water-loving head", "The oily tail", "Neither; soap dissolves grease with heat"], ar: ["الرأس المحب للماء", "الذيل الدهني", "لا هذا ولا ذاك، فالصابون يذيب الدهون بالحرارة"] },
        answer: 1,
        explain: {
          en: "The oily tail mixes with fats, while the head faces the water so the bundle can be rinsed.",
          ar: "يمتزج الذيل الدهني بالدهون، بينما يتجه الرأس إلى الماء فيمكن شطف الحزمة."
        }
      }
    },
    {
      id: "ek-07",
      title: { en: "The Puzzle of QWERTY", ar: "لغز لوحة المفاتيح كويرتي" },
      body: {
        en: "Glance at a keyboard and ask why the letters are scattered so strangely. The layout dates back to typewriters developed in the United States in the 1870s, especially the design by Christopher Latham Sholes. A popular story says the arrangement was meant to slow typists down, but historians generally doubt that. A more widely accepted explanation is that common letter pairs were separated so the typewriter's metal arms would jam less often, though telegraph operators' needs may also have played a role. Whatever the exact reasons, once typists learned it, the habit stuck, and computers inherited it.",
        ar: "انظر إلى لوحة المفاتيح واسأل نفسك: لماذا تتوزع الحروف بهذه الطريقة الغريبة؟ يعود هذا الترتيب إلى الآلات الكاتبة التي طُوّرت في الولايات المتحدة في سبعينيات القرن التاسع عشر، ولا سيما تصميم كريستوفر لاثام شولز. وتقول قصة شائعة إن الترتيب وُضع لإبطاء الكاتبين، لكن المؤرخين يشككون في ذلك عمومًا. والتفسير الأكثر قبولًا أن أزواج الحروف الشائعة فُصلت كي تقل حالات تشابك الأذرع المعدنية في الآلة، وربما أدت احتياجات عمال التلغراف دورًا أيضًا. ومهما كانت الأسباب الدقيقة، فبعد أن تعلّمه الكاتبون ترسّخت العادة، ثم ورثتها الحواسيب."
      },
      takeaway: {
        en: "QWERTY began with typewriter mechanics and survived mainly through habit.",
        ar: "بدأ ترتيب كويرتي مع آليات الآلة الكاتبة واستمر أساسًا بقوة العادة."
      },
      source: { title: "Wikipedia — QWERTY", url: "https://en.wikipedia.org/wiki/QWERTY" },
      quiz: {
        q: { en: "Why do computers still use the QWERTY layout?", ar: "لماذا ما زالت الحواسيب تستخدم ترتيب كويرتي؟" },
        options: { en: ["It is proven to be the fastest layout", "Typists learned it and the habit stuck", "Computers need it to avoid jamming"], ar: ["لأنه ثبت أنه الترتيب الأسرع", "لأن الكاتبين تعلّموه فترسّخت العادة", "لأن الحواسيب تحتاجه لتجنب التشابك"] },
        answer: 1,
        explain: {
          en: "The layout came from typewriter design, and widespread familiarity kept it in use.",
          ar: "جاء الترتيب من تصميم الآلة الكاتبة، وأبقاه انتشار الاعتياد عليه مستخدمًا."
        }
      }
    },
    {
      id: "ek-08",
      title: { en: "Why the Sea Is Salty", ar: "لماذا ماء البحر مالح؟" },
      body: {
        en: "A swimmer gets a mouthful of seawater and wonders why rivers taste fresh but the ocean does not. The salt begins on land. Rain is slightly acidic, and as it falls on rocks it slowly dissolves minerals, releasing ions such as sodium and chloride. Rivers carry these dissolved minerals to the sea. There, the sun evaporates water, but the salts stay behind. Over immense spans of time, this steady delivery, along with minerals from vents on the seafloor, has built up the ocean's saltiness. River water does carry salt; it is simply too dilute for us to taste.",
        ar: "يبتلع سبّاح جرعة من ماء البحر فيتساءل: لماذا تكون الأنهار عذبة بينما المحيط ليس كذلك؟ يبدأ الملح من اليابسة. فالمطر حمضي قليلًا، وحين يسقط على الصخور يذيب معادنها ببطء فيطلق أيونات مثل الصوديوم والكلوريد. ثم تحمل الأنهار هذه المعادن الذائبة إلى البحر. وهناك تبخّر الشمس الماء، لكن الأملاح تبقى. وعلى مدى أزمنة هائلة تراكمت ملوحة المحيط بفضل هذا الإمداد المتواصل، إلى جانب معادن تخرج من فتحات في قاع البحر. فماء الأنهار يحمل ملحًا فعلًا، لكنه مخفف جدًا فلا نتذوقه."
      },
      takeaway: {
        en: "Rivers carry dissolved minerals to the sea, where evaporation leaves the salt behind.",
        ar: "تنقل الأنهار المعادن الذائبة إلى البحر، فيتبخر الماء ويبقى الملح."
      },
      source: { title: "NOAA Ocean Service — Why is the ocean salty?", url: "https://oceanservice.noaa.gov/facts/whysalty.html" },
      quiz: {
        q: { en: "Why does salt build up in the ocean?", ar: "لماذا يتراكم الملح في المحيط؟" },
        options: { en: ["Fish produce it", "Rain falls already salty from clouds", "Water evaporates but dissolved salts stay behind"], ar: ["لأن الأسماك تنتجه", "لأن المطر يهطل مالحًا من السحب", "لأن الماء يتبخر وتبقى الأملاح الذائبة"] },
        answer: 2,
        explain: {
          en: "Rivers keep delivering dissolved minerals, and evaporation removes water but not salt.",
          ar: "تواصل الأنهار جلب المعادن الذائبة، والتبخر يزيل الماء دون الملح."
        }
      }
    },
    {
      id: "ek-09",
      title: { en: "A Fridge Moves Heat, Not Cold", ar: "الثلاجة تنقل الحرارة لا البرودة" },
      body: {
        en: "Put your hand near the back or bottom of a refrigerator and you may feel warmth. That is a clue to how it works: a fridge does not make cold, it moves heat out. A special fluid called a refrigerant circulates in a loop. Inside the fridge, it evaporates at low pressure, and evaporating absorbs heat from the food, just as sweat cools your skin. A compressor then squeezes the vapour, making it hot, and it releases that heat into the kitchen through coils as it condenses back into a liquid. Then the cycle repeats.",
        ar: "قرّب يدك من خلف الثلاجة أو أسفلها وقد تشعر بدفء. وهذا مفتاح لفهم عملها: فالثلاجة لا تصنع البرودة، بل تنقل الحرارة إلى الخارج. يدور سائل خاص يُسمى مادة التبريد في دائرة مغلقة. ففي داخل الثلاجة يتبخر عند ضغط منخفض، والتبخر يمتص الحرارة من الطعام، تمامًا كما يبرّد العرق جلدك. ثم يضغط الضاغط البخار فيصبح ساخنًا، فيطلق حرارته في المطبخ عبر الملفات وهو يتكثف عائدًا إلى سائل. ثم تتكرر الدورة من جديد."
      },
      takeaway: {
        en: "A refrigerator pumps heat out of its interior using an evaporating refrigerant.",
        ar: "تضخ الثلاجة الحرارة من داخلها إلى الخارج بواسطة مادة تبريد تتبخر."
      },
      source: { title: "Wikipedia — Refrigerator", url: "https://en.wikipedia.org/wiki/Refrigerator" },
      quiz: {
        q: { en: "Why does the back of a fridge feel warm?", ar: "لماذا يكون خلف الثلاجة دافئًا؟" },
        options: { en: ["It releases heat taken from inside", "The motor is broken", "It stores spare electricity"], ar: ["لأنها تطلق الحرارة التي سحبتها من الداخل", "لأن المحرك معطل", "لأنها تخزن كهرباء فائضة"] },
        answer: 0,
        explain: {
          en: "The refrigerant carries heat from the food to the outer coils, where it is released into the room.",
          ar: "تنقل مادة التبريد الحرارة من الطعام إلى الملفات الخارجية فتنطلق في الغرفة."
        }
      }
    },
    {
      id: "ek-10",
      title: { en: "How Coffee Keeps You Awake", ar: "كيف تبقيك القهوة مستيقظًا؟" },
      body: {
        en: "Late in the afternoon, a student feels heavy-eyed, drinks a cup of coffee, and soon feels alert again. Behind this is a molecule called adenosine. While you are awake, adenosine builds up in the brain and binds to receptors that promote drowsiness, a bit like sand filling an hourglass. Caffeine has a similar shape, so it slips into those receptors and blocks them without triggering the sleepy signal. The tiredness is hidden, not removed. When the caffeine wears off, the built-up adenosine can act again, and because caffeine lingers for hours, late cups can disturb sleep.",
        ar: "في آخر العصر يشعر طالب بثقل في جفنيه، فيشرب فنجان قهوة، وسرعان ما يستعيد يقظته. وراء ذلك جزيء يُسمى الأدينوزين. فطوال فترة اليقظة يتراكم الأدينوزين في الدماغ ويرتبط بمستقبلات تعزز النعاس، كأنه رمل يملأ ساعة رملية. وللكافيين شكل مشابه، فيدخل إلى تلك المستقبلات ويسدّها دون أن يطلق إشارة النعاس. فالتعب يُخفى ولا يزول. وحين يزول أثر الكافيين يعود الأدينوزين المتراكم إلى العمل، ولأن الكافيين يبقى في الجسم ساعات فقد يفسد الفنجان المتأخر النوم."
      },
      takeaway: {
        en: "Caffeine blocks adenosine receptors, hiding tiredness rather than removing it.",
        ar: "يسدّ الكافيين مستقبلات الأدينوزين فيُخفي التعب ولا يزيله."
      },
      source: { title: "Wikipedia — Caffeine", url: "https://en.wikipedia.org/wiki/Caffeine" },
      quiz: {
        q: { en: "How does caffeine make you feel more alert?", ar: "كيف يجعلك الكافيين أكثر يقظة؟" },
        options: { en: ["It adds energy directly to brain cells", "It removes adenosine from the brain", "It blocks the receptors adenosine uses"], ar: ["يضيف طاقة مباشرة إلى خلايا الدماغ", "يزيل الأدينوزين من الدماغ", "يسدّ المستقبلات التي يستخدمها الأدينوزين"] },
        answer: 2,
        explain: {
          en: "Caffeine occupies adenosine receptors without activating them, so the drowsy signal is blocked for a while.",
          ar: "يشغل الكافيين مستقبلات الأدينوزين دون تنشيطها، فتُحجب إشارة النعاس مؤقتًا."
        }
      }
    }
  ]
});
