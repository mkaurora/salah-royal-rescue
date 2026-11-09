(self.SPARKS_DECKS = self.SPARKS_DECKS || []).push({
  id: 'business-strategy',
  order: 5,
  emoji: '♟️',
  title: { en: 'Business & Strategy', ar: 'الأعمال والاستراتيجية' },
  blurb: { en: 'The quiet logic behind companies that last and those that fade.', ar: 'المنطق الخفي وراء شركات تدوم وأخرى تتلاشى.' },
  cards: [
    {
      id: 'bs-01',
      title: { en: 'Moats: Why Some Castles Survive', ar: 'الخنادق: لماذا تصمد بعض القلاع؟' },
      body: {
        en: "Two bakeries open on the same street. Both bake excellent bread, yet within a year one is struggling while the other has a queue. The busy one owns a secret recipe, a beloved brand, and a supplier deal nobody else can match. Investors call this kind of lasting protection an economic moat, borrowing the image of a ditch around a castle. Moats can come from brand loyalty, patents, high switching costs, cost advantages, or network effects. A good product attracts customers; a moat stops rivals from simply copying it and stealing them away.",
        ar: "يفتتح مخبزان في الشارع نفسه، وكلاهما يخبز خبزًا ممتازًا، لكن بعد عام يتعثر أحدهما بينما يصطف الزبائن أمام الآخر. يملك المخبز الناجح وصفة سرية وعلامة محبوبة واتفاقًا مع مورّد لا يستطيع غيره مجاراته. يسمي المستثمرون هذه الحماية الدائمة خندقًا اقتصاديًا، تشبيهًا بالخندق المحفور حول القلعة. وقد ينشأ الخندق من ولاء العملاء للعلامة، أو براءات الاختراع، أو ارتفاع كلفة الانتقال إلى منافس، أو ميزة في التكاليف، أو آثار الشبكة. المنتج الجيد يجذب العملاء، أما الخندق فيمنع المنافسين من تقليده وانتزاعهم بسهولة."
      },
      takeaway: { en: 'A great product wins customers; a moat keeps them.', ar: 'المنتج الجيد يكسب العملاء، والخندق يحافظ عليهم.' },
      source: { title: 'Wikipedia — Economic moat', url: 'https://en.wikipedia.org/wiki/Economic_moat' },
      quiz: {
        q: { en: 'What does an economic moat do for a business?', ar: 'ماذا يفعل الخندق الاقتصادي للشركة؟' },
        options: {
          en: ['Guarantees the lowest prices in the market', 'Protects it from rivals copying its success', 'Removes the need for good products'],
          ar: ['يضمن أدنى الأسعار في السوق', 'يحميها من منافسين يقلدون نجاحها', 'يُغني عن الحاجة إلى منتجات جيدة']
        },
        answer: 1,
        explain: { en: 'A moat is a durable advantage, such as brand or switching costs, that makes it hard for competitors to take customers away.', ar: 'الخندق ميزة دائمة كالعلامة أو كلفة الانتقال، تصعّب على المنافسين انتزاع العملاء.' }
      }
    },
    {
      id: 'bs-02',
      title: { en: 'Opportunity Cost and the Power of No', ar: 'كلفة الفرصة البديلة وقوة الرفض' },
      body: {
        en: "A small design studio is offered a big, well-paid project from a client it does not really want. Saying yes looks like free money. But the team has only so many hours, and accepting means turning away the work that builds the reputation it is aiming for. Economists call the value of the best alternative you give up the opportunity cost. Every choice has one, even when no money changes hands. This is why focused companies often say no to good opportunities: each yes quietly spends time, attention and people that could have gone to something better.",
        ar: "يُعرض على استوديو تصميم صغير مشروع كبير مجزٍ من عميل لا يرغب فيه حقًا. تبدو الموافقة مالًا سهلًا، لكن ساعات الفريق محدودة، وقبول المشروع يعني رفض أعمال تبني السمعة التي يطمح إليها. يسمي الاقتصاديون قيمة أفضل بديل تتخلى عنه كلفة الفرصة البديلة، ولكل قرار كلفة كهذه حتى لو لم يُدفع فيه مال. لهذا ترفض الشركات المركّزة كثيرًا فرصًا جيدة، لأن كل موافقة تستهلك بصمت وقتًا وانتباهًا وأشخاصًا كان يمكن توجيههم إلى ما هو أفضل."
      },
      takeaway: { en: 'Every yes is also a no to something else.', ar: 'كل موافقة هي رفض لشيء آخر في الوقت نفسه.' },
      source: { title: 'Wikipedia — Opportunity cost', url: 'https://en.wikipedia.org/wiki/Opportunity_cost' },
      quiz: {
        q: { en: 'What is opportunity cost?', ar: 'ما المقصود بكلفة الفرصة البديلة؟' },
        options: {
          en: ['The value of the best alternative you give up', 'The cash price paid for a choice', 'The cost of advertising a new opportunity'],
          ar: ['قيمة أفضل بديل تتخلى عنه', 'الثمن النقدي المدفوع مقابل خيار ما', 'كلفة الإعلان عن فرصة جديدة']
        },
        answer: 0,
        explain: { en: 'Opportunity cost is what you forgo by choosing one option, and it exists even when no money is spent.', ar: 'كلفة الفرصة البديلة هي ما تخسره باختيار بديل معين، وهي قائمة حتى لو لم يُنفق مال.' }
      }
    },
    {
      id: 'bs-03',
      title: { en: 'First Mover or Fast Follower?', ar: 'السبّاق أم التابع السريع؟' },
      body: {
        en: "Picture two founders. One rushes to launch a brand-new kind of product, spending heavily to teach customers why they need it. The other waits, watches the pioneer's mistakes, then launches a polished version. Who wins? Being first can bring advantages: early customers, a famous name, and control of scarce resources. But pioneers also pay to educate the market and often guess wrong about what people want. Fast followers can learn from those errors cheaply. History offers examples of both, such as early search engines that were overtaken by a later entrant, Google. Timing helps, but execution usually matters more.",
        ar: "تخيّل مؤسسَين: الأول يسارع إلى إطلاق نوع جديد تمامًا من المنتجات وينفق كثيرًا ليقنع الناس بحاجتهم إليه، والثاني ينتظر ويراقب أخطاء الرائد ثم يطلق نسخة أكثر إتقانًا. فمن يفوز؟ قد يمنح السبق مزايا مثل العملاء الأوائل والاسم المعروف والسيطرة على موارد نادرة، لكن الرواد يدفعون أيضًا كلفة تعريف السوق بالفكرة، وكثيرًا ما يخطئون في تقدير ما يريده الناس. أما التابع السريع فيتعلم من تلك الأخطاء بثمن زهيد. ويقدم التاريخ أمثلة على الحالتين، كمحركات بحث مبكرة تجاوزها لاحقًا محرك غوغل. التوقيت مهم، لكن جودة التنفيذ أهم غالبًا."
      },
      takeaway: { en: 'Being first is an advantage only if you also execute best.', ar: 'السبق ميزة فقط إذا اقترن بأفضل تنفيذ.' },
      source: { title: 'Wikipedia — First-mover advantage', url: 'https://en.wikipedia.org/wiki/First-mover_advantage' },
      quiz: {
        q: { en: 'What is a key advantage of being a fast follower?', ar: 'ما الميزة الأساسية للتابع السريع؟' },
        options: {
          en: ['It always owns the most famous brand', 'It never faces any competition', 'It can learn cheaply from the pioneer’s mistakes'],
          ar: ['يمتلك دائمًا العلامة الأشهر', 'لا يواجه أي منافسة إطلاقًا', 'يتعلم بثمن زهيد من أخطاء الرائد']
        },
        answer: 2,
        explain: { en: 'Followers avoid the cost of educating the market and can fix the errors pioneers made.', ar: 'يتجنب التابع كلفة تعريف السوق بالفكرة، ويستطيع تلافي أخطاء الرواد.' }
      }
    },
    {
      id: 'bs-04',
      title: { en: "Porter's Five Forces", ar: 'قوى بورتر الخمس' },
      body: {
        en: "Why do some industries make rich profits while others barely survive, even with smart managers? Harvard professor Michael Porter offered a framework to answer this puzzle. He pointed to five forces that shape competition: rivalry among existing firms, the threat of new entrants, the threat of substitute products, the bargaining power of suppliers, and the bargaining power of buyers. An airline, for example, faces fierce rivals, powerful suppliers of planes and fuel, and price-sensitive customers. Before entering a market, strategists use the five forces to ask how much profit the structure of the industry will really allow.",
        ar: "لماذا تجني بعض الصناعات أرباحًا وفيرة بينما تكافح أخرى للبقاء رغم براعة مديريها؟ قدّم أستاذ هارفارد مايكل بورتر إطارًا للإجابة عن هذا اللغز، إذ أشار إلى خمس قوى تشكّل المنافسة: شدة التنافس بين الشركات القائمة، وتهديد الداخلين الجدد، وتهديد المنتجات البديلة، والقوة التفاوضية للموردين، والقوة التفاوضية للمشترين. فشركة الطيران مثلًا تواجه منافسين شرسين وموردين أقوياء للطائرات والوقود وعملاء شديدي الحساسية للسعر. لذلك يستخدم الاستراتيجيون القوى الخمس قبل دخول أي سوق ليسألوا: كم من الربح يسمح به هيكل هذه الصناعة فعلًا؟"
      },
      takeaway: { en: 'Industry structure limits profits as much as management skill does.', ar: 'هيكل الصناعة يحدّ الأرباح بقدر ما تحددها مهارة الإدارة.' },
      source: { title: "Wikipedia — Porter's five forces analysis", url: 'https://en.wikipedia.org/wiki/Porter%27s_five_forces_analysis' },
      quiz: {
        q: { en: "Which of these is one of Porter's five forces?", ar: 'أيٌّ مما يلي من قوى بورتر الخمس؟' },
        options: {
          en: ['The company’s logo design', 'The bargaining power of suppliers', 'The number of office buildings'],
          ar: ['تصميم شعار الشركة', 'القوة التفاوضية للموردين', 'عدد مباني المكاتب']
        },
        answer: 1,
        explain: { en: 'Supplier power is one of the five forces, alongside rivalry, new entrants, substitutes and buyer power.', ar: 'قوة الموردين إحدى القوى الخمس، إلى جانب التنافس والداخلين الجدد والبدائل وقوة المشترين.' }
      }
    },
    {
      id: 'bs-05',
      title: { en: 'Economies of Scale', ar: 'وفورات الحجم' },
      body: {
        en: "A small workshop makes a hundred chairs a month and pays full price for every plank. A large factory makes a hundred thousand, buys timber in bulk at a discount, and spreads the cost of its expensive machines across every chair. Each chair costs the factory far less to produce. This is the idea of economies of scale: as output grows, the average cost per unit tends to fall. It explains why big retailers can undercut corner stores. But scale has limits; very large organizations can become slow and costly to coordinate, which economists call diseconomies of scale.",
        ar: "تصنع ورشة صغيرة مئة كرسي في الشهر وتدفع السعر الكامل لكل لوح خشب، بينما يصنع مصنع كبير مئة ألف، فيشتري الخشب بالجملة بخصم، ويوزع كلفة آلاته الباهظة على كل كرسي. وهكذا تقل كلفة الكرسي الواحد عليه كثيرًا. هذه فكرة وفورات الحجم: كلما زاد الإنتاج مالت الكلفة المتوسطة للوحدة إلى الانخفاض، وهذا ما يفسر قدرة المتاجر الكبرى على البيع بأسعار أقل من المتاجر الصغيرة. لكن للحجم حدودًا، فالمؤسسات الضخمة جدًا قد تصبح بطيئة ومكلفة في التنسيق، وهو ما يسميه الاقتصاديون تبعات الحجم المفرط."
      },
      takeaway: { en: 'Bigger often means cheaper per unit, but only up to a point.', ar: 'الحجم الأكبر يعني غالبًا كلفة أقل للوحدة، لكن إلى حدٍّ معين.' },
      source: { title: 'Wikipedia — Economies of scale', url: 'https://en.wikipedia.org/wiki/Economies_of_scale' },
      quiz: {
        q: { en: 'What happens under economies of scale?', ar: 'ماذا يحدث في ظل وفورات الحجم؟' },
        options: {
          en: ['Total costs fall to zero', 'Every product becomes more expensive', 'Average cost per unit falls as output grows'],
          ar: ['تنخفض التكاليف الكلية إلى الصفر', 'يصبح كل منتج أغلى ثمنًا', 'تنخفض الكلفة المتوسطة للوحدة مع زيادة الإنتاج']
        },
        answer: 2,
        explain: { en: 'Spreading fixed costs and buying in bulk lowers the cost of each unit as production rises.', ar: 'توزيع التكاليف الثابتة والشراء بالجملة يخفضان كلفة كل وحدة مع ارتفاع الإنتاج.' }
      }
    },
    {
      id: 'bs-06',
      title: { en: 'Disruption From Below', ar: 'الزعزعة القادمة من الأسفل' },
      body: {
        en: "A leading company listens carefully to its best customers and keeps making its products more powerful and expensive. Meanwhile, a newcomer sells something simpler and cheaper that the leader's customers dismiss as inferior. The newcomer serves people the leader ignores, improves steadily, and one day becomes good enough for the mainstream. Professor Clayton Christensen called this disruptive innovation. His key insight was that well-run firms can fail precisely because they do the sensible thing: chase high-margin customers. Scholars still debate how widely the theory applies, but it remains a powerful warning against ignoring the low end.",
        ar: "تصغي شركة رائدة بعناية إلى أفضل عملائها، وتواصل جعل منتجاتها أقوى وأغلى. وفي الأثناء يبيع منافس جديد منتجًا أبسط وأرخص يستخف به عملاء الشركة الرائدة. يخدم الوافد الجديد فئات تتجاهلها الرائدة، ويتحسن بثبات، حتى يصبح يومًا ما جيدًا بما يكفي لعامة السوق. سمّى الأستاذ كلايتون كريستنسن هذه الظاهرة الابتكار المزعزع، وكانت فكرته الجوهرية أن الشركات المُدارة جيدًا قد تفشل لأنها تفعل الأمر المنطقي تمامًا: ملاحقة العملاء ذوي الهوامش المرتفعة. وما زال الباحثون يناقشون مدى انطباق النظرية، لكنها تبقى تحذيرًا قويًا من إهمال الطرف الأدنى من السوق."
      },
      takeaway: { en: 'The cheap, simple rival you dismiss today may replace you tomorrow.', ar: 'المنافس البسيط الرخيص الذي تستخف به اليوم قد يحل محلك غدًا.' },
      source: { title: 'Wikipedia — Disruptive innovation', url: 'https://en.wikipedia.org/wiki/Disruptive_innovation' },
      quiz: {
        q: { en: 'According to the theory, why do well-run leaders get disrupted?', ar: 'وفق النظرية، لماذا تتعرض الشركات الرائدة المُدارة جيدًا للزعزعة؟' },
        options: {
          en: ['They focus on high-margin customers and ignore the low end', 'They refuse to listen to any customers', 'They always charge prices that are too low'],
          ar: ['تركز على العملاء ذوي الهوامش المرتفعة وتهمل الطرف الأدنى', 'ترفض الإصغاء إلى أي عميل', 'تفرض دائمًا أسعارًا منخفضة جدًا']
        },
        answer: 0,
        explain: { en: 'Leaders sensibly chase their best customers, leaving room for a cheaper entrant to grow from below.', ar: 'تلاحق الشركات الرائدة أفضل عملائها بمنطق سليم، فتترك مجالًا لوافد أرخص كي ينمو من الأسفل.' }
      }
    },
    {
      id: 'bs-07',
      title: { en: 'The Sunk-Cost Trap', ar: 'فخ التكاليف الغارقة' },
      body: {
        en: "A manager has spent two years and a large budget on a software project that clearly is not working. The team suggests stopping, but the manager says they have invested too much to quit now. That money, however, is gone whether the project continues or not. Economists call it a sunk cost, and rational decisions should look only at future costs and benefits. Yet people routinely throw good money after bad, finishing dull films because they paid for the ticket. The useful question is never how much we have spent, but what the best move is from here.",
        ar: "أنفق مدير عامين وميزانية كبيرة على مشروع برمجي لا ينجح بوضوح. يقترح الفريق التوقف، فيرد المدير بأنهم استثمروا أكثر من أن يتراجعوا الآن. غير أن ذلك المال ذهب سواء استمر المشروع أم لا، ويسميه الاقتصاديون تكلفة غارقة. والقرار الرشيد ينظر فقط إلى التكاليف والمنافع المستقبلية، ومع ذلك يواصل الناس إنفاق المال الجيد وراء المال الضائع، كمن يكمل فيلمًا مملًا لأنه دفع ثمن التذكرة. السؤال المفيد ليس كم أنفقنا، بل ما أفضل خطوة من هذه النقطة فصاعدًا."
      },
      takeaway: { en: 'Decide based on the future, not on what is already spent.', ar: 'اتخذ قرارك بناءً على المستقبل، لا على ما أُنفق بالفعل.' },
      source: { title: 'Wikipedia — Sunk cost', url: 'https://en.wikipedia.org/wiki/Sunk_cost' },
      quiz: {
        q: { en: 'How should a sunk cost affect a rational decision?', ar: 'كيف ينبغي أن تؤثر التكلفة الغارقة في القرار الرشيد؟' },
        options: {
          en: ['It should be the main reason to continue', 'It should double the project budget', 'It should be ignored, since it cannot be recovered'],
          ar: ['ينبغي أن تكون السبب الرئيس للاستمرار', 'ينبغي أن تضاعف ميزانية المشروع', 'ينبغي تجاهلها لأنها لا يمكن استردادها']
        },
        answer: 2,
        explain: { en: 'Sunk costs are gone either way, so only future costs and benefits should guide the choice.', ar: 'التكاليف الغارقة ضائعة في كل الأحوال، لذا يجب أن تحكم القرار التكاليف والمنافع المستقبلية وحدها.' }
      }
    },
    {
      id: 'bs-08',
      title: { en: 'Unit Economics: Does Each Sale Pay?', ar: 'اقتصاديات الوحدة: هل تربح كل عملية بيع؟' },
      body: {
        en: "A meal-delivery startup is growing fast and celebrating every new order. Then someone does the maths on a single customer: it costs a lot in advertising to win them, each delivery loses a little after paying the driver, and many customers leave after a few weeks. Growth is making the losses bigger, not smaller. Unit economics means checking whether one unit of business, often one customer, is profitable on its own. Two common measures are customer acquisition cost and customer lifetime value. If lifetime value does not comfortably exceed acquisition cost, scaling up only multiplies the problem.",
        ar: "تنمو شركة ناشئة لتوصيل الوجبات بسرعة وتحتفل بكل طلب جديد. ثم يحسب أحدهم أرقام عميل واحد: كسبه يكلف كثيرًا من الإعلانات، وكل توصيلة تخسر قليلًا بعد دفع أجرة السائق، وكثير من العملاء يغادرون بعد أسابيع قليلة. إن النمو يضخم الخسائر بدل أن يقلصها. تعني اقتصاديات الوحدة التحقق من أن وحدة واحدة من النشاط، وغالبًا ما تكون عميلًا واحدًا، مربحة بذاتها. ومن أشهر مقاييسها كلفة اكتساب العميل والقيمة الدائمة للعميل. فإن لم تتجاوز القيمة الدائمة كلفة الاكتساب بهامش مريح، فإن التوسع لا يفعل سوى مضاعفة المشكلة."
      },
      takeaway: { en: 'If one sale loses money, more sales lose more money.', ar: 'إذا خسرت عملية البيع الواحدة، فالمزيد من المبيعات يعني خسارة أكبر.' },
      source: { title: 'Wikipedia — Customer lifetime value', url: 'https://en.wikipedia.org/wiki/Customer_lifetime_value' },
      quiz: {
        q: { en: 'What does healthy unit economics require?', ar: 'ما الذي تتطلبه اقتصاديات الوحدة السليمة؟' },
        options: {
          en: ['The fastest possible growth in orders', 'Customer lifetime value clearly above acquisition cost', 'Spending more on advertising than competitors'],
          ar: ['أسرع نمو ممكن في الطلبات', 'قيمة دائمة للعميل تفوق بوضوح كلفة اكتسابه', 'الإنفاق على الإعلان أكثر من المنافسين']
        },
        answer: 1,
        explain: { en: 'Each customer must bring in more than it costs to win and serve them, or growth deepens losses.', ar: 'يجب أن يجلب كل عميل أكثر مما يكلف كسبه وخدمته، وإلا عمّق النمو الخسائر.' }
      }
    },
    {
      id: 'bs-09',
      title: { en: 'Build Small, Learn Fast, Pivot', ar: 'ابنِ صغيرًا وتعلّم بسرعة ثم غيّر المسار' },
      body: {
        en: "A team spends a year building a perfect app, launches it, and discovers nobody wants it. Another team spends two weeks on a rough version with just one core feature, shows it to real users, and learns what they actually need. The second approach is the minimum viable product: the simplest thing that lets you test your key assumption with real customers. Popularised by the lean startup movement, it pairs with the idea of a pivot, changing direction based on evidence while keeping what you have learned. Several well-known companies began as something quite different before pivoting.",
        ar: "يقضي فريق عامًا كاملًا في بناء تطبيق مثالي، ثم يطلقه فيكتشف أن أحدًا لا يريده. ويقضي فريق آخر أسبوعين في نسخة أولية بميزة أساسية واحدة، يعرضها على مستخدمين حقيقيين فيعرف ما يحتاجون إليه فعلًا. هذا النهج الثاني هو المنتج الأدنى القابل للتطبيق: أبسط شيء يتيح لك اختبار افتراضك الجوهري مع عملاء حقيقيين. وقد نشرته حركة الشركات الناشئة الرشيقة، ويقترن بفكرة التحول، أي تغيير الاتجاه بناءً على الأدلة مع الاحتفاظ بما تعلمته. وقد بدأت شركات معروفة عدة بفكرة مختلفة تمامًا قبل أن تغيّر مسارها."
      },
      takeaway: { en: 'Test your riskiest assumption cheaply before building everything.', ar: 'اختبر أخطر افتراضاتك بكلفة زهيدة قبل أن تبني كل شيء.' },
      source: { title: 'Wikipedia — Minimum viable product', url: 'https://en.wikipedia.org/wiki/Minimum_viable_product' },
      quiz: {
        q: { en: 'What is the main purpose of a minimum viable product?', ar: 'ما الهدف الرئيس من المنتج الأدنى القابل للتطبيق؟' },
        options: {
          en: ['To test a key assumption with real users quickly', 'To launch with every feature finished', 'To avoid talking to customers until launch'],
          ar: ['اختبار افتراض جوهري مع مستخدمين حقيقيين بسرعة', 'الإطلاق بكل الميزات مكتملة', 'تجنب الحديث مع العملاء حتى الإطلاق']
        },
        answer: 0,
        explain: { en: 'An MVP is the simplest version that lets a team learn from real customers before investing heavily.', ar: 'هو أبسط نسخة تتيح للفريق التعلم من عملاء حقيقيين قبل استثمار كبير.' }
      }
    },
    {
      id: 'bs-10',
      title: { en: 'Network Effects', ar: 'آثار الشبكة' },
      body: {
        en: "Imagine owning the only telephone in the world. It would be useless, because there is nobody to call. Add a second phone and it becomes slightly useful; add millions and it becomes essential. This is a network effect: a product becomes more valuable to each user as more people use it. Messaging apps, marketplaces and social platforms depend on it. Network effects can create powerful moats, because a newcomer with a better product still offers fewer people to connect with. They also explain why such markets often tip toward one or two dominant players.",
        ar: "تخيّل أنك تملك الهاتف الوحيد في العالم؛ سيكون بلا فائدة لأنه لا يوجد من تتصل به. أضف هاتفًا ثانيًا فيصبح مفيدًا قليلًا، وأضف الملايين فيصبح ضروريًا. هذا هو أثر الشبكة: تزداد قيمة المنتج لكل مستخدم كلما زاد عدد مستخدميه. وتعتمد عليه تطبيقات المراسلة والأسواق الإلكترونية ومنصات التواصل. وقد تبني آثار الشبكة خنادق قوية، لأن الوافد الجديد حتى لو قدم منتجًا أفضل يتيح عددًا أقل من الناس للتواصل معهم. وهذا ما يفسر ميل هذه الأسواق غالبًا إلى أن يهيمن عليها لاعب أو اثنان."
      },
      takeaway: { en: 'When value grows with users, the leader can become hard to catch.', ar: 'حين تنمو القيمة بنمو المستخدمين، يصعب اللحاق بالمتصدر.' },
      source: { title: 'Wikipedia — Network effect', url: 'https://en.wikipedia.org/wiki/Network_effect' },
      quiz: {
        q: { en: 'What defines a network effect?', ar: 'ما الذي يميز أثر الشبكة؟' },
        options: {
          en: ['Costs fall as a factory grows', 'A product gains value for each user as more people use it', 'Prices rise when supply is limited'],
          ar: ['تنخفض التكاليف مع نمو المصنع', 'تزداد قيمة المنتج لكل مستخدم كلما زاد مستخدموه', 'ترتفع الأسعار حين يكون العرض محدودًا']
        },
        answer: 1,
        explain: { en: 'Like the telephone, the product is worth more to everyone as the network of users grows.', ar: 'كما في الهاتف، تزداد قيمة المنتج للجميع كلما اتسعت شبكة مستخدميه.' }
      }
    }
  ]
});
