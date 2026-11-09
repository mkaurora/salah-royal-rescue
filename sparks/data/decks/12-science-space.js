(self.SPARKS_DECKS = self.SPARKS_DECKS || []).push({
  id: "science-space",
  order: 12,
  emoji: "🔭",
  title: { en: "Science & Space", ar: "العلوم والفضاء" },
  blurb: {
    en: "Big ideas about our planet, our bodies and the universe beyond.",
    ar: "أفكار كبرى عن كوكبنا وأجسامنا والكون من حولنا."
  },
  cards: [
    {
      id: "ss-01",
      title: { en: "Why the Sky Is Blue", ar: "لماذا السماء زرقاء؟" },
      body: {
        en: "A child lying on the grass asks a simple question: if sunlight looks white, why is the sky blue? Sunlight contains all the colours of the rainbow. As it passes through the air, it bumps into tiny gas molecules far smaller than its wavelengths. These molecules scatter short wavelengths, like blue, much more strongly than long ones, like red. This effect is called Rayleigh scattering. So blue light is bounced around the whole sky and reaches our eyes from every direction. At sunset, light travels through more air, the blue is scattered away, and reds and oranges remain.",
        ar: "يستلقي طفل على العشب ويسأل سؤالًا بسيطًا: إذا كان ضوء الشمس أبيض، فلماذا السماء زرقاء؟ يحتوي ضوء الشمس على جميع ألوان الطيف. وحين يعبر الهواء يصطدم بجزيئات غازية دقيقة أصغر بكثير من أطوال موجاته. وهذه الجزيئات تبعثر الأطوال الموجية القصيرة كالأزرق أكثر بكثير من الطويلة كالأحمر، وتُسمى هذه الظاهرة تشتت رايلي. لذلك ينتشر الضوء الأزرق في أرجاء السماء ويصل إلى أعيننا من كل اتجاه. وعند الغروب يقطع الضوء مسافة أطول في الهواء، فيتبعثر الأزرق بعيدًا ويبقى الأحمر والبرتقالي."
      },
      takeaway: {
        en: "Air scatters blue light most, so blue reaches us from all over the sky.",
        ar: "يبعثر الهواء الضوء الأزرق أكثر من غيره، فيصلنا من كل أنحاء السماء."
      },
      source: { title: "NASA Space Place — Why Is the Sky Blue?", url: "https://spaceplace.nasa.gov/blue-sky/en/" },
      quiz: {
        q: { en: "Why does blue light fill the daytime sky?", ar: "لماذا يملأ الضوء الأزرق سماء النهار؟" },
        options: { en: ["The ocean reflects its colour upward", "Air molecules scatter short blue wavelengths most strongly", "The Sun emits only blue light"], ar: ["لأن المحيط يعكس لونه إلى الأعلى", "لأن جزيئات الهواء تبعثر الموجات الزرقاء القصيرة أكثر", "لأن الشمس لا تطلق إلا ضوءًا أزرق"] },
        answer: 1,
        explain: {
          en: "Rayleigh scattering affects short wavelengths far more, so blue light is spread across the sky.",
          ar: "يؤثر تشتت رايلي في الموجات القصيرة أكثر بكثير، فينتشر الأزرق في السماء."
        }
      }
    },
    {
      id: "ss-02",
      title: { en: "A Telescope That Looks Back in Time", ar: "تلسكوب ينظر إلى الماضي" },
      body: {
        en: "When you look at a distant star, you are not seeing it as it is now. Light travels fast but not instantly, and a light-year is the distance it covers in one year. So light from a star a hundred light-years away left it a century ago. The James Webb Space Telescope, launched in 2021, pushes this idea to the extreme. It observes mainly in infrared, because light from the earliest galaxies has been stretched to longer wavelengths as the universe expanded. Infrared also passes through dust clouds, letting Webb see stars being born.",
        ar: "حين تنظر إلى نجم بعيد فأنت لا تراه كما هو الآن. فالضوء سريع لكنه ليس لحظيًا، والسنة الضوئية هي المسافة التي يقطعها الضوء في سنة واحدة. لذلك فإن ضوء نجم يبعد مئة سنة ضوئية غادره قبل قرن من الزمان. ويأخذ تلسكوب جيمس ويب الفضائي، الذي أُطلق عام ٢٠٢١، هذه الفكرة إلى أقصاها. فهو يرصد أساسًا بالأشعة تحت الحمراء، لأن ضوء المجرات الأولى تمدد إلى أطوال موجية أطول مع اتساع الكون. كما تخترق هذه الأشعة سحب الغبار، فتتيح له رؤية نجوم في طور الولادة."
      },
      takeaway: {
        en: "Looking far into space means looking back in time, which Webb does in infrared.",
        ar: "النظر بعيدًا في الفضاء نظر إلى الماضي، وهذا ما يفعله ويب بالأشعة تحت الحمراء."
      },
      source: { title: "Wikipedia — James Webb Space Telescope", url: "https://en.wikipedia.org/wiki/James_Webb_Space_Telescope" },
      quiz: {
        q: { en: "Why does the Webb telescope observe mainly in infrared?", ar: "لماذا يرصد تلسكوب ويب أساسًا بالأشعة تحت الحمراء؟" },
        options: { en: ["Light from early galaxies is stretched to longer wavelengths", "Infrared travels faster than visible light", "Visible light cannot reach space"], ar: ["لأن ضوء المجرات الأولى تمدد إلى أطوال موجية أطول", "لأن الأشعة تحت الحمراء أسرع من الضوء المرئي", "لأن الضوء المرئي لا يصل إلى الفضاء"] },
        answer: 0,
        explain: {
          en: "As the universe expanded, ancient light was stretched into infrared, which also passes through dust.",
          ar: "مع اتساع الكون تمدد الضوء القديم إلى الأشعة تحت الحمراء، وهي تخترق الغبار أيضًا."
        }
      }
    },
    {
      id: "ss-03",
      title: { en: "Measuring Earth With a Shadow", ar: "قياس الأرض بظل" },
      body: {
        en: "More than two thousand years ago, a librarian in Alexandria heard a curious report: at noon on the summer solstice in Syene, far to the south, the Sun shone straight down a well and cast no shadow. Eratosthenes noticed that in Alexandria, at the same moment, a vertical stick did cast a short shadow. If Earth were flat, both places would match. The difference in angle showed the surface was curved. Knowing the distance between the cities, he used simple geometry to estimate the planet's circumference, arriving at a figure remarkably close to the modern value.",
        ar: "قبل أكثر من ألفي عام سمع أمين مكتبة في الإسكندرية خبرًا لافتًا: في ظهيرة يوم الانقلاب الصيفي في أسوان جنوبًا، تسطع الشمس عمودية في قاع بئر فلا يكون لها ظل. ولاحظ إراتوستينس أن عصا قائمة في الإسكندرية في اللحظة نفسها تلقي ظلًا قصيرًا. فلو كانت الأرض مسطحة لتطابق المكانان، أما اختلاف الزاوية فدلّ على أن سطحها منحنٍ. وبمعرفة المسافة بين المدينتين استخدم هندسة بسيطة لتقدير محيط الكوكب، فوصل إلى رقم قريب على نحو مدهش من القيمة الحديثة."
      },
      takeaway: {
        en: "Eratosthenes used two shadows and geometry to estimate Earth's size.",
        ar: "استخدم إراتوستينس ظلين والهندسة لتقدير حجم الأرض."
      },
      source: { title: "Encyclopaedia Britannica — Eratosthenes", url: "https://www.britannica.com/biography/Eratosthenes" },
      quiz: {
        q: { en: "What did the different shadows in two cities show Eratosthenes?", ar: "ماذا كشف اختلاف الظلين في المدينتين لإراتوستينس؟" },
        options: { en: ["That the Sun moves around Earth", "That Earth is flat", "That Earth's surface is curved"], ar: ["أن الشمس تدور حول الأرض", "أن الأرض مسطحة", "أن سطح الأرض منحنٍ"] },
        answer: 2,
        explain: {
          en: "On a flat Earth the shadows would match; the angle difference revealed curvature and allowed a size estimate.",
          ar: "لو كانت الأرض مسطحة لتطابق الظلان، فكشف فرق الزاوية عن الانحناء وأتاح تقدير الحجم."
        }
      }
    },
    {
      id: "ss-04",
      title: { en: "We Are Made of Star Stuff", ar: "نحن مصنوعون من مادة النجوم" },
      body: {
        en: "Hold a piece of jewellery and consider where its atoms came from. Shortly after the Big Bang, the universe contained almost only hydrogen and helium. Stars changed that. In their hot, dense cores, they fuse light nuclei into heavier ones, building carbon, oxygen and eventually iron while releasing the energy that makes them shine. When massive stars die in violent explosions, and when dead stars collide, even heavier elements such as gold are forged and scattered into space. Those clouds later formed new stars and planets, so the calcium in your bones was once made inside a star.",
        ar: "أمسك قطعة من الحلي وتأمل من أين جاءت ذراتها. بعد الانفجار العظيم بوقت قصير لم يكن في الكون تقريبًا سوى الهيدروجين والهيليوم. ثم غيّرت النجوم ذلك؛ ففي أنويتها الحارة الكثيفة تدمج النوى الخفيفة لتصنع نوى أثقل، فتبني الكربون والأكسجين وصولًا إلى الحديد، وتطلق الطاقة التي تجعلها تتوهج. وحين تموت النجوم الضخمة في انفجارات عنيفة، أو تتصادم نجوم ميتة، تتكوّن عناصر أثقل كالذهب وتتناثر في الفضاء. ومن تلك السحب تشكلت لاحقًا نجوم وكواكب جديدة، فالكالسيوم في عظامك صُنع يومًا داخل نجم."
      },
      takeaway: {
        en: "Most elements heavier than helium were forged inside stars and their explosions.",
        ar: "معظم العناصر الأثقل من الهيليوم صُنعت داخل النجوم وفي انفجاراتها."
      },
      source: { title: "Wikipedia — Stellar nucleosynthesis", url: "https://en.wikipedia.org/wiki/Stellar_nucleosynthesis" },
      quiz: {
        q: { en: "How do stars create heavier elements?", ar: "كيف تصنع النجوم العناصر الأثقل؟" },
        options: { en: ["By fusing lighter nuclei in their cores", "By absorbing planets", "By cooling hydrogen into metal"], ar: ["بدمج النوى الخفيفة في أنويتها", "بابتلاع الكواكب", "بتبريد الهيدروجين حتى يصير معدنًا"] },
        answer: 0,
        explain: {
          en: "Nuclear fusion in stellar cores builds heavier nuclei and releases the energy that makes stars shine.",
          ar: "يبني الاندماج النووي في أنوية النجوم نوى أثقل ويطلق الطاقة التي تجعلها تتوهج."
        }
      }
    },
    {
      id: "ss-05",
      title: { en: "The Point of No Return", ar: "نقطة اللاعودة" },
      body: {
        en: "Imagine a spaceship drifting toward a black hole. Far away, nothing strange happens; the black hole pulls like any object of the same mass. But closer in lies a boundary called the event horizon. Inside it, gravity is so intense that the escape speed exceeds the speed of light, so nothing, not even light, can get back out. That is why black holes look dark. Astronomers find them by watching their effects: stars orbiting an unseen mass, or gas glowing hot as it swirls inward. In 2019 a global network of telescopes captured the first image of a black hole's shadow.",
        ar: "تخيّل مركبة فضائية تنجرف نحو ثقب أسود. من بعيد لا يحدث شيء غريب، فالثقب الأسود يجذب كأي جسم له الكتلة نفسها. لكن عند الاقتراب توجد حدود تُسمى أفق الحدث، وفي داخلها تبلغ الجاذبية حدًا تتجاوز فيه سرعة الإفلات سرعة الضوء، فلا يستطيع شيء، ولا حتى الضوء، أن يخرج. لهذا تبدو الثقوب السوداء مظلمة. ويكتشفها الفلكيون من آثارها: نجوم تدور حول كتلة غير مرئية، أو غاز يتوهج بشدة وهو يدور نحو الداخل. وفي عام ٢٠١٩ التقطت شبكة عالمية من التلسكوبات أول صورة لظل ثقب أسود."
      },
      takeaway: {
        en: "Beyond a black hole's event horizon, not even light can escape.",
        ar: "بعد أفق الحدث في الثقب الأسود لا يستطيع حتى الضوء أن يفلت."
      },
      source: { title: "Encyclopaedia Britannica — Black hole", url: "https://www.britannica.com/science/black-hole" },
      quiz: {
        q: { en: "What is the event horizon of a black hole?", ar: "ما أفق الحدث في الثقب الأسود؟" },
        options: { en: ["The bright ring of stars around it", "The boundary beyond which nothing can escape", "The point where it stops pulling"], ar: ["حلقة النجوم اللامعة حوله", "الحد الذي لا يفلت بعده أي شيء", "النقطة التي يتوقف عندها عن الجذب"] },
        answer: 1,
        explain: {
          en: "Inside the event horizon the escape speed exceeds the speed of light, so nothing comes back out.",
          ar: "داخل أفق الحدث تتجاوز سرعة الإفلات سرعة الضوء، فلا يخرج منه شيء."
        }
      }
    },
    {
      id: "ss-06",
      title: { en: "The Photograph Behind the Double Helix", ar: "الصورة التي كشفت اللولب المزدوج" },
      body: {
        en: "In a London laboratory in the early 1950s, a chemist aimed X-rays at carefully prepared fibres of DNA and recorded the patterns they made on film. Rosalind Franklin's meticulous work produced images showing a distinctive X shape, a strong clue that the molecule was a helix. Her data, shared without her full knowledge, helped James Watson and Francis Crick build their 1953 model of DNA as a double helix: two twisted strands linked by paired bases, like a spiral ladder. The structure instantly suggested how genetic information could be copied. Today Franklin is widely recognised as essential to the discovery.",
        ar: "في مختبر بلندن مطلع خمسينيات القرن العشرين، وجّهت كيميائية أشعة سينية نحو ألياف من الحمض النووي أعدّتها بعناية، وسجّلت الأنماط التي تتركها على الفيلم. أنتج عمل روزاليند فرانكلين الدقيق صورًا تُظهر شكلًا مميزًا يشبه حرف إكس، وهو دليل قوي على أن الجزيء حلزوني. وقد ساعدت بياناتها، التي اطّلع عليها آخرون دون علمها الكامل، جيمس واطسون وفرانسيس كريك على بناء نموذجهما عام ١٩٥٣ للحمض النووي بوصفه لولبًا مزدوجًا: شريطان ملتفان تربطهما قواعد متزاوجة كسلّم حلزوني. وكشف هذا البناء فورًا كيف يمكن نسخ المعلومات الوراثية. واليوم يُعترف على نطاق واسع بأن فرانكلين كانت أساسية في هذا الاكتشاف."
      },
      takeaway: {
        en: "Rosalind Franklin's X-ray images were key to revealing DNA's double helix.",
        ar: "كانت صور روزاليند فرانكلين بالأشعة السينية مفتاحًا لكشف اللولب المزدوج للحمض النووي."
      },
      source: { title: "Wikipedia — Rosalind Franklin", url: "https://en.wikipedia.org/wiki/Rosalind_Franklin" },
      quiz: {
        q: { en: "What did Rosalind Franklin's X-ray images suggest about DNA?", ar: "ماذا أوحت صور روزاليند فرانكلين بالأشعة السينية عن الحمض النووي؟" },
        options: { en: ["That it is a flat sheet", "That it is a single straight chain", "That it has a helical shape"], ar: ["أنه صفيحة مسطحة", "أنه سلسلة مستقيمة واحدة", "أن له شكلًا حلزونيًا"] },
        answer: 2,
        explain: {
          en: "The X-shaped pattern in her images was strong evidence that DNA is a helix.",
          ar: "كان النمط الذي يشبه حرف إكس في صورها دليلًا قويًا على أن الحمض النووي حلزوني."
        }
      }
    },
    {
      id: "ss-07",
      title: { en: "Continents on the Move", ar: "قارات في حركة دائمة" },
      body: {
        en: "Look at a world map and the coasts of South America and Africa seem to fit like puzzle pieces. Early in the twentieth century, the scientist Alfred Wegener argued that the continents had drifted apart, but he could not explain how. The answer came decades later from the ocean floor. Earth's outer shell is broken into large plates that move a few centimetres a year, about as fast as fingernails grow. Where plates pull apart, new seafloor forms; where they collide, mountains rise and earthquakes strike. This theory, plate tectonics, explains volcanoes, ocean trenches and the Himalayas.",
        ar: "انظر إلى خريطة العالم، وستبدو سواحل أمريكا الجنوبية وإفريقيا متطابقة كقطع أحجية. في أوائل القرن العشرين رأى العالم ألفريد فيغنر أن القارات تباعدت عن بعضها، لكنه لم يستطع تفسير الكيفية. وجاء الجواب بعد عقود من قاع المحيط. فالغلاف الخارجي للأرض مقسّم إلى صفائح كبيرة تتحرك بضعة سنتيمترات في السنة، أي بسرعة نمو الأظافر تقريبًا. وحيث تتباعد الصفائح يتكوّن قاع بحري جديد، وحيث تتصادم ترتفع الجبال وتقع الزلازل. وهذه النظرية، الصفائح التكتونية، تفسر البراكين والخنادق المحيطية وجبال الهيمالايا."
      },
      takeaway: {
        en: "Earth's surface is made of slowly moving plates that shape mountains and quakes.",
        ar: "سطح الأرض صفائح تتحرك ببطء فتصنع الجبال والزلازل."
      },
      source: { title: "Encyclopaedia Britannica — Plate tectonics", url: "https://www.britannica.com/science/plate-tectonics" },
      quiz: {
        q: { en: "Roughly how fast do tectonic plates move?", ar: "بأي سرعة تقريبًا تتحرك الصفائح التكتونية؟" },
        options: { en: ["A few metres per day", "A few centimetres per year", "They do not move at all"], ar: ["بضعة أمتار في اليوم", "بضعة سنتيمترات في السنة", "لا تتحرك إطلاقًا"] },
        answer: 1,
        explain: {
          en: "Plates creep a few centimetres a year, about the speed fingernails grow.",
          ar: "تزحف الصفائح بضعة سنتيمترات سنويًا، بسرعة نمو الأظافر تقريبًا."
        }
      }
    },
    {
      id: "ss-08",
      title: { en: "The Moon Pulls the Sea", ar: "القمر يجذب البحر" },
      body: {
        en: "A fisher on a beach notices that the water creeps up the sand and retreats again, roughly twice a day, and the timing shifts a little later each day. The cause is the Moon. Its gravity pulls hardest on the side of Earth facing it and weakest on the far side. This difference stretches the oceans into two bulges, one toward the Moon and one away from it. As Earth rotates through these bulges, coasts experience high and low tides. The Sun adds its own smaller pull, so when Sun and Moon line up, tides are especially high.",
        ar: "يلاحظ صياد على الشاطئ أن الماء يزحف على الرمل ثم ينحسر، مرتين في اليوم تقريبًا، وأن الموعد يتأخر قليلًا كل يوم. والسبب هو القمر. فجاذبيته تكون أقوى على جانب الأرض المواجه له وأضعف على الجانب البعيد. وهذا الفرق يمدّ المحيطات في انتفاخين، أحدهما نحو القمر والآخر في الجهة المقابلة. ومع دوران الأرض عبر هذين الانتفاخين تشهد السواحل المدّ والجزر. وتضيف الشمس جذبًا أصغر، فحين تصطف الشمس والقمر يكون المد مرتفعًا بشكل خاص."
      },
      takeaway: {
        en: "Differences in the Moon's pull across Earth create two tidal bulges.",
        ar: "يصنع اختلاف جذب القمر عبر الأرض انتفاخين للمد."
      },
      source: { title: "Wikipedia — Tide", url: "https://en.wikipedia.org/wiki/Tide" },
      quiz: {
        q: { en: "Why are tides especially high when the Sun and Moon line up?", ar: "لماذا يكون المد مرتفعًا بشكل خاص حين تصطف الشمس والقمر؟" },
        options: { en: ["Their pulls combine", "The Moon gets closer to the Sun", "Earth stops rotating briefly"], ar: ["لأن جذبيهما يجتمعان", "لأن القمر يقترب من الشمس", "لأن الأرض تتوقف عن الدوران لحظة"] },
        answer: 0,
        explain: {
          en: "The Sun adds a smaller pull of its own; aligned with the Moon, the two effects add up.",
          ar: "تضيف الشمس جذبًا أصغر، وحين تصطف مع القمر يجتمع التأثيران."
        }
      }
    },
    {
      id: "ss-09",
      title: { en: "Footprints in Lunar Dust", ar: "آثار أقدام على غبار القمر" },
      body: {
        en: "In July 1969, hundreds of millions of people around the world gathered around televisions to watch grainy black-and-white pictures. The Apollo 11 lunar module had landed on the Moon, and Neil Armstrong stepped onto its surface, followed by Buzz Aldrin, while Michael Collins circled overhead in the command module. The astronauts collected rock and soil samples, set up experiments and planted a flag before returning safely to Earth. Because the Moon has no wind or rain, the bootprints they left behind could last for a very long time, a quiet record of a remarkable journey.",
        ar: "في يوليو ١٩٦٩ تجمّع مئات الملايين حول العالم أمام أجهزة التلفاز يتابعون صورًا باهتة بالأبيض والأسود. فقد هبطت مركبة أبولو ١١ القمرية على القمر، ونزل نيل أرمسترونغ إلى سطحه ثم تبعه باز ألدرين، بينما كان مايكل كولينز يدور فوقهما في وحدة القيادة. جمع الرائدان عينات من الصخور والتربة، وأقاما تجارب علمية، وغرسا علمًا، ثم عاد الثلاثة بسلام إلى الأرض. ولأن القمر بلا رياح ولا أمطار، فقد تبقى آثار أحذيتهما زمنًا طويلًا جدًا، شاهدًا صامتًا على رحلة استثنائية."
      },
      takeaway: {
        en: "Apollo 11 put the first humans on the Moon in July 1969.",
        ar: "أوصلت أبولو ١١ أول البشر إلى سطح القمر في يوليو ١٩٦٩."
      },
      source: { title: "Encyclopaedia Britannica — Apollo 11", url: "https://www.britannica.com/topic/Apollo-11" },
      quiz: {
        q: { en: "Which Apollo 11 astronaut stayed in orbit around the Moon?", ar: "أي رواد أبولو ١١ بقي في المدار حول القمر؟" },
        options: { en: ["Neil Armstrong", "Buzz Aldrin", "Michael Collins"], ar: ["نيل أرمسترونغ", "باز ألدرين", "مايكل كولينز"] },
        answer: 2,
        explain: {
          en: "Michael Collins circled the Moon in the command module while the other two walked on the surface.",
          ar: "دار مايكل كولينز حول القمر في وحدة القيادة بينما مشى الآخران على السطح."
        }
      }
    },
    {
      id: "ss-10",
      title: { en: "The Tilt That Makes Seasons", ar: "الميل الذي يصنع الفصول" },
      body: {
        en: "A traveller flies from a snowy northern city in December and lands in a southern city where people are at the beach. How can both be true on the same day? The answer is not distance from the Sun. Earth's axis is tilted by about twenty-three and a half degrees. As Earth orbits, the half leaning toward the Sun gets more direct sunlight and longer days, so it has summer. The half leaning away gets slanted light and short days, so it has winter. Six months later, the roles swap. In fact, Earth is closest to the Sun in early January.",
        ar: "يغادر مسافر مدينة شمالية مكسوة بالثلج في ديسمبر، ويهبط في مدينة جنوبية يقضي أهلها وقتهم على الشاطئ. فكيف يصح الأمران في اليوم نفسه؟ ليس السبب البعد عن الشمس، بل ميل محور الأرض بنحو ثلاث وعشرين درجة ونصف. فخلال دوران الأرض حول الشمس، يتلقى النصف المائل نحوها أشعة أكثر مباشرة ونهارًا أطول فيعيش الصيف، بينما يتلقى النصف المائل بعيدًا أشعة مائلة ونهارًا قصيرًا فيعيش الشتاء. وبعد ستة أشهر تنقلب الأدوار. بل إن الأرض تكون في أقرب نقطة إلى الشمس في أوائل يناير."
      },
      takeaway: {
        en: "Seasons come from Earth's tilted axis, not its distance from the Sun.",
        ar: "تنشأ الفصول من ميل محور الأرض لا من بعدها عن الشمس."
      },
      source: { title: "NASA Space Place — What Causes the Seasons?", url: "https://spaceplace.nasa.gov/seasons/en/" },
      quiz: {
        q: { en: "What mainly causes Earth's seasons?", ar: "ما السبب الرئيسي لتعاقب الفصول على الأرض؟" },
        options: { en: ["The tilt of Earth's axis", "Earth getting closer to the Sun in summer", "Changes in the Sun's brightness"], ar: ["ميل محور الأرض", "اقتراب الأرض من الشمس صيفًا", "تغير سطوع الشمس"] },
        answer: 0,
        explain: {
          en: "The tilt changes how directly sunlight strikes each hemisphere and how long days last.",
          ar: "يغيّر الميل مدى مباشرة أشعة الشمس على كل نصف من الأرض وطول النهار فيه."
        }
      }
    }
  ]
});
