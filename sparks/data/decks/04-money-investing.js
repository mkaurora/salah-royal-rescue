(self.SPARKS_DECKS = self.SPARKS_DECKS || []).push({
  id: "money-investing",
  order: 4,
  emoji: "📈",
  title: { en: "Money & Investing", ar: "المال والاستثمار" },
  blurb: {
    en: "Big ideas behind saving and investing, explained simply. Educational only, not financial advice.",
    ar: "أفكار كبرى وراء الادخار والاستثمار بشرح مبسّط. محتوى تعليمي وليس نصيحة مالية."
  },
  cards: [
    {
      id: "mi-01",
      title: { en: "Compounding: time does the heavy lifting", ar: "النمو المركّب: الوقت يحمل العبء" },
      body: {
        en: "Two friends each set aside the same monthly amount. One starts at twenty-five, the other waits until thirty-five. Imagine both earn a hypothetical 5% a year and reinvest every gain. The early starter ends up far ahead, not because she saved harder, but because her money had ten extra years to grow. That is compounding: returns begin to earn returns of their own. Each year's growth is a little larger than the last, so the curve stays fairly flat for a long while and then bends sharply upward. The key ingredient is not brilliance but time.",
        ar: "صديقتان تدّخر كل منهما المبلغ الشهري نفسه، لكن الأولى تبدأ في الخامسة والعشرين، والثانية تنتظر حتى الخامسة والثلاثين. لنفترض أن كلتيهما تحقق عائدًا افتراضيًا قدره خمسة في المئة سنويًا، وتعيد استثمار كل ربح. ستتقدّم التي بدأت مبكرًا بفارق كبير، لا لأنها ادّخرت بجهد أكبر، بل لأن مالها حظي بعشر سنوات إضافية لينمو. هذا هو النمو المركّب: العوائد تبدأ هي نفسها في توليد عوائد. ويكون نمو كل عام أكبر قليلًا من سابقه، فيبقى المنحنى شبه مستوٍ مدة طويلة ثم ينحني صاعدًا بحدّة. والمكوّن الأهم ليس الذكاء بل الوقت."
      },
      takeaway: {
        en: "Starting early matters because returns earn returns over time.",
        ar: "البدء المبكر مهم لأن العوائد تولّد عوائد مع مرور الوقت."
      },
      source: { title: "Investor.gov — Compound Interest Calculator", url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator" },
      quiz: {
        q: { en: "In the story, why does the early starter end up ahead?", ar: "في القصة، لماذا تتقدّم التي بدأت مبكرًا؟" },
        options: {
          en: ["Her money had more years to compound", "She picked riskier investments", "She paid lower taxes"],
          ar: ["لأن مالها حظي بسنوات أكثر للنمو المركّب", "لأنها اختارت استثمارات أكثر مخاطرة", "لأنها دفعت ضرائب أقل"]
        },
        answer: 0,
        explain: {
          en: "Both earned the same hypothetical rate; the extra ten years let returns build on returns.",
          ar: "حصلت الاثنتان على العائد الافتراضي نفسه، لكن السنوات العشر الإضافية سمحت للعوائد بأن تتراكم فوق العوائد."
        }
      }
    },
    {
      id: "mi-02",
      title: { en: "Inflation: the silent thief", ar: "التضخم: اللص الصامت" },
      body: {
        en: "A grandmother tucks banknotes into a drawer to keep them safe. Twenty years later, every note is still there, yet together they buy noticeably less at the market. Nothing was stolen; prices simply rose. That steady rise in the general price level is inflation, and it quietly shrinks the purchasing power of idle cash. Imagine prices rising by a hypothetical 3% a year: something costing 100 today would cost about 180 after twenty years. Holding some cash for safety and near-term needs is sensible, but over long periods money that earns nothing loses ground.",
        ar: "تخبّئ جدّة أوراقًا نقدية في درج لتحفظها. وبعد عشرين عامًا تجدها كلها في مكانها، لكنها صارت تشتري من السوق أقل بكثير. لم يسرق أحد شيئًا، كل ما في الأمر أن الأسعار ارتفعت. هذا الارتفاع المستمر في المستوى العام للأسعار هو التضخم، وهو يقلّص بصمت القوة الشرائية للنقود المكدّسة. لنفترض أن الأسعار ترتفع بنسبة افتراضية قدرها ثلاثة في المئة سنويًا: ما يكلّف مئة اليوم سيكلّف نحو مئة وثمانين بعد عشرين عامًا. الاحتفاظ ببعض النقد للأمان وللحاجات القريبة أمر معقول، لكن المال الذي لا يكسب شيئًا يخسر أرضه على المدى الطويل."
      },
      takeaway: {
        en: "Cash that earns nothing slowly loses buying power to inflation.",
        ar: "النقد الذي لا يكسب شيئًا يفقد قوته الشرائية ببطء بسبب التضخم."
      },
      source: { title: "Wikipedia — Inflation", url: "https://en.wikipedia.org/wiki/Inflation" },
      quiz: {
        q: { en: "What does inflation do to cash kept idle for many years?", ar: "ماذا يفعل التضخم بالنقد المكدّس لسنوات طويلة؟" },
        options: {
          en: ["Increases its value automatically", "Has no effect on it", "Reduces what it can buy"],
          ar: ["يزيد قيمته تلقائيًا", "لا يؤثر فيه", "يقلّل ما يمكن شراؤه به"]
        },
        answer: 2,
        explain: {
          en: "The number on the notes stays the same, but rising prices mean they buy less.",
          ar: "يبقى الرقم المكتوب على الأوراق كما هو، لكن ارتفاع الأسعار يعني أنها تشتري أقل."
        }
      }
    },
    {
      id: "mi-03",
      title: { en: "Risk and return go together", ar: "المخاطرة والعائد متلازمان" },
      body: {
        en: "Picture two offers. One promises a modest, steady payment. The other might pay much more, or might lose money in a bad year. Most people would want an extra reward before choosing the second, uncertain path, and markets work the same way. Investments with higher expected returns, such as shares in companies, tend to swing more widely in value than safer options like short-term government bonds or bank deposits. The trade-off is not a guarantee: risk means the better outcome may never arrive. Anyone promising high returns with no risk deserves deep suspicion.",
        ar: "تخيّل عرضين: الأول يعد بدفعة متواضعة ثابتة، والثاني قد يدفع أكثر بكثير، وقد يخسر المال في سنة سيئة. معظم الناس يريدون مكافأة إضافية قبل أن يختاروا الطريق الثاني غير المضمون، والأسواق تعمل بالمنطق نفسه. فالاستثمارات ذات العائد المتوقع الأعلى، مثل أسهم الشركات، تميل قيمتها إلى التقلّب أكثر من الخيارات الأكثر أمانًا كالسندات الحكومية قصيرة الأجل أو الودائع المصرفية. لكن هذه المقايضة ليست ضمانًا، فالمخاطرة تعني أن النتيجة الأفضل قد لا تأتي أبدًا. ومن يعد بعوائد مرتفعة بلا أي مخاطرة يستحق شكًا عميقًا."
      },
      takeaway: {
        en: "Higher expected returns come with bigger swings and no guarantees.",
        ar: "العائد المتوقع الأعلى يأتي مع تقلّبات أكبر ودون أي ضمان."
      },
      source: { title: "Wikipedia — Risk–return spectrum", url: "https://en.wikipedia.org/wiki/Risk%E2%80%93return_spectrum" },
      quiz: {
        q: { en: "What is the usual relationship between risk and expected return?", ar: "ما العلاقة المعتادة بين المخاطرة والعائد المتوقع؟" },
        options: {
          en: ["Higher risk always guarantees higher returns", "Higher expected return usually comes with higher risk", "Safe investments usually earn the most"],
          ar: ["المخاطرة الأعلى تضمن دائمًا عائدًا أعلى", "العائد المتوقع الأعلى يأتي عادةً مع مخاطرة أعلى", "الاستثمارات الآمنة تحقق عادةً أعلى العوائد"]
        },
        answer: 1,
        explain: {
          en: "Investors demand a reward for uncertainty, but risk means that reward is never guaranteed.",
          ar: "يطلب المستثمرون مكافأة مقابل عدم اليقين، لكن المخاطرة تعني أن هذه المكافأة غير مضمونة أبدًا."
        }
      }
    },
    {
      id: "mi-04",
      title: { en: "Diversification: many baskets", ar: "التنويع: سلال كثيرة" },
      body: {
        en: "A farmer who plants a single crop can be ruined if one disease strikes it. A neighbour who grows several crops loses some of the harvest, but survives. Investing works in a similar way. Putting all your money into one company ties your fate to that single business. Spreading money across many companies, industries, countries and types of asset means one disaster hurts less, because not everything tends to fall at the same moment. Diversification cannot remove the risk of the whole market dropping, but it greatly reduces the danger of one bad bet sinking everything.",
        ar: "المزارع الذي يزرع محصولًا واحدًا قد يُفلس إذا أصابه مرض واحد، أما جاره الذي يزرع محاصيل متنوعة فيخسر جزءًا من الحصاد لكنه ينجو. والاستثمار يشبه ذلك. فوضع كل مالك في شركة واحدة يربط مصيرك بمصيرها. أما توزيع المال على شركات وقطاعات ودول وأنواع أصول كثيرة، فيجعل أثر أي كارثة منفردة أخف، لأن كل شيء لا يميل إلى الهبوط في اللحظة نفسها. لا يستطيع التنويع إزالة خطر هبوط السوق بأكمله، لكنه يقلّل كثيرًا خطر أن يُغرق رهان خاسر واحد كل شيء."
      },
      takeaway: {
        en: "Spreading money widely limits the damage any single failure can do.",
        ar: "توزيع المال على نطاق واسع يحدّ من الضرر الذي يسببه أي فشل منفرد."
      },
      source: { title: "Wikipedia — Diversification (finance)", url: "https://en.wikipedia.org/wiki/Diversification_(finance)" },
      quiz: {
        q: { en: "Which risk can diversification NOT remove?", ar: "أيّ خطر لا يستطيع التنويع إزالته؟" },
        options: {
          en: ["The whole market falling", "A single company failing", "One industry having a bad year"],
          ar: ["هبوط السوق بأكمله", "إفلاس شركة واحدة", "مرور قطاع واحد بسنة سيئة"]
        },
        answer: 0,
        explain: {
          en: "Diversification softens single failures, but when the whole market falls, most holdings fall together.",
          ar: "يخفّف التنويع أثر الإخفاقات المنفردة، لكن حين يهبط السوق كله تهبط معظم الاستثمارات معًا."
        }
      }
    },
    {
      id: "mi-05",
      title: { en: "Index funds: owning the haystack", ar: "صناديق المؤشرات: امتلاك السوق كلها" },
      body: {
        en: "In the 1970s, a radical idea reached ordinary investors: instead of paying experts to hunt for winning stocks, simply buy a small piece of everything in a market index and hold it. An index fund does exactly that, tracking a basket such as a broad stock index rather than trying to beat it. Because there are no star managers researching and trading constantly, costs can be very low. Studies have repeatedly found that many actively managed funds fail to beat their benchmark after fees over long periods. Passive investing accepts the market's return instead of chasing more.",
        ar: "في سبعينيات القرن العشرين وصلت إلى المستثمرين العاديين فكرة جريئة: بدلًا من الدفع لخبراء يبحثون عن الأسهم الرابحة، اشترِ جزءًا صغيرًا من كل ما في مؤشر السوق واحتفظ به. وهذا بالضبط ما يفعله صندوق المؤشر، إذ يتتبّع سلة من الأسهم كمؤشر واسع للسوق بدلًا من محاولة التفوق عليه. ولأنه لا يحتاج إلى مديرين نجوم يبحثون ويتداولون باستمرار، يمكن أن تكون تكاليفه منخفضة جدًا. وقد وجدت دراسات متكررة أن كثيرًا من الصناديق المُدارة بنشاط تعجز عن التفوق على مؤشرها المرجعي بعد خصم الرسوم على المدى الطويل. فالاستثمار السلبي يقبل عائد السوق بدل مطاردة المزيد."
      },
      takeaway: {
        en: "Index funds aim to match the market cheaply rather than beat it.",
        ar: "تسعى صناديق المؤشرات إلى مجاراة السوق بتكلفة زهيدة لا إلى التفوق عليه."
      },
      source: { title: "Wikipedia — Index fund", url: "https://en.wikipedia.org/wiki/Index_fund" },
      quiz: {
        q: { en: "What does an index fund aim to do?", ar: "ما الذي يسعى إليه صندوق المؤشر؟" },
        options: {
          en: ["Beat the market by picking winners", "Track a market index at low cost", "Avoid owning shares entirely"],
          ar: ["التفوق على السوق باختيار الرابحين", "تتبّع مؤشر السوق بتكلفة منخفضة", "تجنّب امتلاك الأسهم تمامًا"]
        },
        answer: 1,
        explain: {
          en: "An index fund holds the whole basket in an index, aiming to match its return with minimal costs.",
          ar: "يمتلك صندوق المؤشر السلة كاملة، ساعيًا إلى مجاراة عائدها بأقل التكاليف."
        }
      }
    },
    {
      id: "mi-06",
      title: { en: "The quiet drag of fees", ar: "العبء الخفي للرسوم" },
      body: {
        en: "Imagine two identical funds, each growing by a hypothetical 6% a year before costs. One charges 0.2% a year, the other 2%. The gap sounds trivial, a couple of percentage points at most. But fees are taken every single year from the whole balance, and the money removed can no longer compound. Over several decades, the higher-cost fund can leave its investor with a noticeably smaller pot, potentially by a large fraction. Unlike future returns, fees are certain and largely within your control, which is why careful investors check the cost figures before anything else.",
        ar: "تخيّل صندوقين متطابقين، ينمو كل منهما بنسبة افتراضية قدرها ستة في المئة سنويًا قبل التكاليف. يتقاضى الأول رسومًا سنوية قدرها خُمس نقطة مئوية، والثاني نقطتين مئويتين. يبدو الفرق تافهًا، لكن الرسوم تُقتطع كل عام من الرصيد كله، والمال المقتطع لم يعد قادرًا على النمو المركّب. وعلى مدى عقود، قد يترك الصندوق الأعلى تكلفة لصاحبه مبلغًا أصغر بوضوح، وربما بنسبة كبيرة. وعلى عكس العوائد المستقبلية، فإن الرسوم مؤكدة وتقع إلى حد بعيد تحت سيطرتك، ولهذا يتفحّص المستثمرون الحريصون أرقام التكاليف قبل أي شيء آخر."
      },
      takeaway: {
        en: "Small yearly fees compound into big differences over decades.",
        ar: "الرسوم السنوية الصغيرة تتراكم لتصنع فروقًا كبيرة على مدى العقود."
      },
      source: { title: "Wikipedia — Expense ratio", url: "https://en.wikipedia.org/wiki/Expense_ratio" },
      quiz: {
        q: { en: "Why do small annual fees matter so much over decades?", ar: "لماذا تكتسب الرسوم السنوية الصغيرة أهمية كبيرة على مدى العقود؟" },
        options: {
          en: ["They are charged only once", "They are refunded at the end", "They are taken every year and stop that money compounding"],
          ar: ["لأنها تُدفع مرة واحدة فقط", "لأنها تُستردّ في النهاية", "لأنها تُقتطع كل عام فتمنع ذلك المال من النمو المركّب"]
        },
        answer: 2,
        explain: {
          en: "Fees come out of the whole balance every year, so the lost money also loses all its future growth.",
          ar: "تُقتطع الرسوم من الرصيد كله كل عام، فيخسر المال المقتطع أيضًا كل نموه المستقبلي."
        }
      }
    },
    {
      id: "mi-07",
      title: { en: "The emergency fund cushion", ar: "صندوق الطوارئ وسادة أمان" },
      body: {
        en: "A car breaks down in the same month a job ends. Without savings, the only options may be expensive debt or selling investments at a bad moment. An emergency fund is a cushion of cash set aside for exactly these surprises. Common guidance suggests holding several months of essential expenses somewhere safe and easy to reach, such as a savings account, rather than in volatile investments. It will not earn much, and that is fine; its job is not growth but calm. With the cushion in place, long-term investments can be left alone to do their work.",
        ar: "تتعطّل السيارة في الشهر نفسه الذي ينتهي فيه العمل. ومن دون مدخرات، قد لا يبقى أمامك سوى دين مكلف أو بيع استثماراتك في توقيت سيئ. صندوق الطوارئ وسادة من النقد تُجنَّب لمواجهة هذه المفاجآت تحديدًا. وتنصح الإرشادات الشائعة بالاحتفاظ بما يغطي نفقات أساسية لعدة أشهر في مكان آمن يسهل الوصول إليه، كحساب توفير، لا في استثمارات متقلّبة. لن يكسب هذا المال كثيرًا، ولا بأس في ذلك، فمهمته ليست النمو بل الطمأنينة. ومع وجود هذه الوسادة، يمكن ترك الاستثمارات طويلة الأجل تؤدي عملها بهدوء."
      },
      takeaway: {
        en: "An emergency fund buys calm and protects long-term plans from surprises.",
        ar: "صندوق الطوارئ يمنحك الطمأنينة ويحمي خططك الطويلة من المفاجآت."
      },
      source: { title: "Investor.gov — Introduction to Investing", url: "https://www.investor.gov/introduction-investing" },
      quiz: {
        q: { en: "What is the main purpose of an emergency fund?", ar: "ما الغرض الأساسي من صندوق الطوارئ؟" },
        options: {
          en: ["Earning the highest possible return", "Buying shares during booms", "Covering surprises without debt or forced selling"],
          ar: ["تحقيق أعلى عائد ممكن", "شراء الأسهم في أوقات الازدهار", "مواجهة المفاجآت دون دين أو بيع اضطراري"]
        },
        answer: 2,
        explain: {
          en: "Its job is calm, not growth: it covers shocks so you avoid costly debt or selling at a bad time.",
          ar: "مهمته الطمأنينة لا النمو، فهو يغطي الصدمات لتتجنب الدين المكلف أو البيع في توقيت سيئ."
        }
      }
    },
    {
      id: "mi-08",
      title: { en: "Crashes and staying the course", ar: "الانهيارات والثبات على الخطة" },
      body: {
        en: "In October 1929, panic swept the New York Stock Exchange, and the crash that followed helped usher in the Great Depression. In 2008, a crisis rooted in risky mortgage lending sent markets around the world tumbling again. Both times, many investors sold in fear near the bottom, locking in their losses. Broad markets did eventually recover, though after 1929 it took many years, and no recovery is ever guaranteed for a single investment. The lesson many draw is to plan before a crash: keep money needed soon out of the market, diversify, and avoid decisions driven by panic.",
        ar: "في أكتوبر 1929 اجتاح الذعر بورصة نيويورك، وأسهم الانهيار الذي تلاه في دخول العالم الكساد الكبير. وفي عام 2008 تسبّبت أزمة نابعة من قروض عقارية عالية المخاطر في هبوط الأسواق حول العالم من جديد. وفي المرتين باع كثير من المستثمرين بدافع الخوف قرب القاع، فثبّتوا خسائرهم. وقد تعافت الأسواق الواسعة في النهاية، وإن استغرق ذلك بعد 1929 سنوات طويلة، ولا يوجد تعافٍ مضمون لأي استثمار منفرد. والدرس الذي يستخلصه كثيرون هو التخطيط قبل الانهيار: إبقاء المال المطلوب قريبًا خارج السوق، والتنويع، وتجنّب القرارات التي يمليها الذعر."
      },
      takeaway: {
        en: "Plan before a crash so panic does not make your decisions.",
        ar: "خطّط قبل الانهيار حتى لا يتخذ الذعر قراراتك عنك."
      },
      source: { title: "Wikipedia — Wall Street Crash of 1929", url: "https://en.wikipedia.org/wiki/Wall_Street_Crash_of_1929" },
      quiz: {
        q: { en: "What mistake did many investors make during the 1929 and 2008 crashes?", ar: "ما الخطأ الذي وقع فيه كثير من المستثمرين في انهياري 1929 و2008؟" },
        options: {
          en: ["Selling in panic near the bottom", "Holding too much cash", "Diversifying too widely"],
          ar: ["البيع بدافع الذعر قرب القاع", "الاحتفاظ بنقد أكثر من اللازم", "التنويع المفرط"]
        },
        answer: 0,
        explain: {
          en: "Selling in fear near the bottom turned temporary falls into permanent losses.",
          ar: "البيع بدافع الخوف قرب القاع حوّل الهبوط المؤقت إلى خسارة دائمة."
        }
      }
    },
    {
      id: "mi-09",
      title: { en: "Dollar-cost averaging", ar: "الاستثمار بمبالغ دورية ثابتة" },
      body: {
        en: "Instead of investing a lump sum all at once, a young teacher decides to invest the same fixed amount on the first day of every month, whatever the headlines say. When prices are high, her money buys fewer units; when prices fall, it buys more. This approach is called dollar-cost averaging. It does not guarantee a profit or protect against loss, and investing a lump sum straight away can do better when markets rise. But for people investing from a monthly income, it builds a steady habit and removes the stressful guessing game of when to buy.",
        ar: "بدلًا من استثمار مبلغ كبير دفعة واحدة، تقرّر معلمة شابة أن تستثمر المبلغ الثابت نفسه في أول يوم من كل شهر، مهما قالت عناوين الأخبار. فحين تكون الأسعار مرتفعة يشتري مالها وحدات أقل، وحين تنخفض يشتري وحدات أكثر. يُسمّى هذا الأسلوب الاستثمار بمبالغ دورية ثابتة. وهو لا يضمن ربحًا ولا يحمي من الخسارة، وقد يكون استثمار المبلغ كاملًا فورًا أفضل حين ترتفع الأسواق. لكنه، لمن يستثمر من دخله الشهري، يبني عادة منتظمة ويزيل لعبة التخمين المرهقة حول توقيت الشراء."
      },
      takeaway: {
        en: "Investing a fixed amount regularly builds habit and removes timing guesswork.",
        ar: "استثمار مبلغ ثابت بانتظام يبني العادة ويُغني عن تخمين التوقيت."
      },
      source: { title: "Wikipedia — Dollar cost averaging", url: "https://en.wikipedia.org/wiki/Dollar_cost_averaging" },
      quiz: {
        q: { en: "Under dollar-cost averaging, what happens when prices fall?", ar: "عند الاستثمار بمبالغ دورية ثابتة، ماذا يحدث حين تنخفض الأسعار؟" },
        options: {
          en: ["Investing stops automatically", "The fixed amount buys more units", "The fixed amount buys fewer units"],
          ar: ["يتوقف الاستثمار تلقائيًا", "يشتري المبلغ الثابت وحدات أكثر", "يشتري المبلغ الثابت وحدات أقل"]
        },
        answer: 1,
        explain: {
          en: "A fixed sum stretches further when prices are lower, so it buys more units.",
          ar: "المبلغ الثابت يذهب أبعد حين تنخفض الأسعار، فيشتري وحدات أكثر."
        }
      }
    },
    {
      id: "mi-10",
      title: { en: "Loss aversion: why losses sting", ar: "النفور من الخسارة: لماذا تؤلمنا الخسائر" },
      body: {
        en: "Imagine a coin flip: tails, you lose 100; heads, you win 150. On average the bet favours you, yet many people refuse it. Research by the psychologists Daniel Kahneman and Amos Tversky helped explain why: losses tend to loom larger in our minds than gains of the same size. This loss aversion can push investors to sell in a panic, cling to losing positions hoping to break even, or avoid sensible risks altogether. Knowing about the bias does not erase it, but writing down simple rules in advance can stop feelings from steering every decision.",
        ar: "تخيّل رمي قطعة نقدية: إن ظهرت الكتابة تخسر مئة، وإن ظهرت الصورة تربح مئة وخمسين. في المتوسط هذا الرهان في صالحك، ومع ذلك يرفضه كثيرون. وقد ساعدت أبحاث عالمَي النفس دانيال كانمان وعاموس تفرسكي على تفسير السبب: فالخسائر تبدو في أذهاننا أكبر من مكاسب مساوية لها في الحجم. ويمكن لهذا النفور من الخسارة أن يدفع المستثمرين إلى البيع في حالة ذعر، أو التمسك باستثمارات خاسرة أملًا في استرداد رأس المال، أو تجنّب مخاطر معقولة تمامًا. ومعرفة هذا التحيّز لا تمحوه، لكن كتابة قواعد بسيطة مسبقًا تمنع المشاعر من قيادة كل قرار."
      },
      takeaway: {
        en: "Losses feel bigger than equal gains, so set rules before emotions take over.",
        ar: "الخسائر تبدو أكبر من المكاسب المساوية لها، فضع قواعدك قبل أن تتحكم بك المشاعر."
      },
      source: { title: "Wikipedia — Loss aversion", url: "https://en.wikipedia.org/wiki/Loss_aversion" },
      quiz: {
        q: { en: "What is loss aversion?", ar: "ما النفور من الخسارة؟" },
        options: {
          en: ["Gains feel stronger than equal losses", "A rule that investors must avoid all risk", "Losses feel more painful than equal gains feel good"],
          ar: ["المكاسب تبدو أقوى من خسائر مساوية لها", "قاعدة تُلزم المستثمرين بتجنّب كل مخاطرة", "الخسارة تؤلم أكثر مما يُفرح مكسب مساوٍ لها"]
        },
        answer: 2,
        explain: {
          en: "Loss aversion is the tendency for losses to weigh more heavily on us than gains of the same size.",
          ar: "النفور من الخسارة هو ميلنا إلى الإحساس بثقل الخسائر أكثر من المكاسب المساوية لها في الحجم."
        }
      }
    }
  ]
});
