(self.SPARKS_DECKS = self.SPARKS_DECKS || []).push({
  id: 'tech-ai',
  order: 7,
  emoji: '🤖',
  title: { en: 'Tech & AI', ar: 'التقنية والذكاء الاصطناعي' },
  blurb: {
    en: 'How computers, networks and learning machines actually work, without the hype.',
    ar: 'كيف تعمل الحواسيب والشبكات والآلات المتعلمة فعلًا، بعيدًا عن المبالغة.'
  },
  cards: [
    {
      id: 'ta-01',
      title: { en: 'Ada Lovelace Sees Beyond Numbers', ar: 'آدا لوفليس ترى ما وراء الأرقام' },
      body: {
        en: `In the 1840s, a young English mathematician sat translating an article about a machine that did not yet exist: the Analytical Engine, designed by Charles Babbage. Ada Lovelace added her own notes, which grew longer than the article itself. In them she set out step-by-step instructions for the engine to calculate a series of numbers, often described as one of the first published computer programs. More strikingly, she suggested that such a machine might handle any symbols, not just numbers, perhaps even music. The engine was never completed, yet her idea of a general-purpose machine anticipated modern computing by about a century.`,
        ar: `في أربعينيات القرن التاسع عشر، جلست عالمة رياضيات إنجليزية شابة تترجم مقالًا عن آلة لم تُبنَ بعد: المحرك التحليلي الذي صممه تشارلز باباج. أضافت آدا لوفليس ملاحظاتها الخاصة حتى صارت أطول من المقال نفسه. وفيها وضعت خطوات متتابعة تجعل الآلة تحسب سلسلة من الأعداد، وكثيرًا ما توصف بأنها من أوائل البرامج الحاسوبية المنشورة. والأدهش أنها رأت أن آلة كهذه قد تتعامل مع أي رموز لا مع الأرقام وحدها، وربما مع الموسيقى أيضًا. لم يكتمل المحرك قط، لكن فكرتها عن آلة متعددة الأغراض سبقت الحوسبة الحديثة بنحو قرن.`
      },
      takeaway: {
        en: 'A computer is a general symbol machine, an idea Lovelace grasped long before one was built.',
        ar: 'الحاسوب آلة عامة لمعالجة الرموز، وقد أدركت لوفليس ذلك قبل بنائه بزمن طويل.'
      },
      source: { title: 'Encyclopaedia Britannica — Ada Lovelace', url: 'https://www.britannica.com/biography/Ada-Lovelace' },
      quiz: {
        q: { en: 'What was most visionary about Lovelace\'s notes?', ar: 'ما الجانب الأكثر بُعدًا في النظر في ملاحظات لوفليس؟' },
        options: {
          en: ['She built the first working computer', 'She saw the machine could process symbols beyond numbers', 'She invented the electric calculator'],
          ar: ['أنها بنت أول حاسوب عامل', 'أنها رأت أن الآلة تستطيع معالجة رموز تتجاوز الأرقام', 'أنها اخترعت الآلة الحاسبة الكهربائية']
        },
        answer: 1,
        explain: {
          en: 'The engine was never finished; her insight was that a computing machine could manipulate any kind of symbol.',
          ar: 'لم يكتمل المحرك قط، وكانت بصيرتها أن آلة الحساب قادرة على معالجة أي نوع من الرموز.'
        }
      }
    },
    {
      id: 'ta-02',
      title: { en: 'Turing\'s Imitation Game', ar: 'لعبة المحاكاة عند تورينغ' },
      body: {
        en: `Picture a judge typing questions to two hidden partners, one human and one machine. If the judge cannot reliably tell which is which, should we say the machine thinks? In 1950 the British mathematician Alan Turing proposed this imitation game, now called the Turing test. His move was clever: instead of arguing endlessly about what thinking really is, he swapped the question for one that could be tested through conversation. Critics have long pointed out that fooling a judge is not the same as understanding. Still, the test shaped decades of debate about what it would mean for a machine to be intelligent.`,
        ar: `تخيّل حَكَمًا يكتب أسئلة إلى طرفين مخفيين، أحدهما إنسان والآخر آلة. فإن عجز عن التمييز بينهما بثقة، فهل نقول إن الآلة تفكر؟ في عام ألف وتسعمئة وخمسين اقترح عالم الرياضيات البريطاني آلان تورينغ هذه اللعبة التي تُعرف اليوم باختبار تورينغ. كانت خطوته ذكية: فبدل الجدل الذي لا ينتهي حول معنى التفكير، استبدل بالسؤال سؤالًا آخر يمكن اختباره عبر المحادثة. وقد نبّه المنتقدون منذ زمن إلى أن خداع الحَكَم ليس هو الفهم نفسه. ومع ذلك شكّل الاختبار عقودًا من النقاش حول معنى ذكاء الآلة.`
      },
      takeaway: {
        en: 'Turing turned a philosophical puzzle into a practical test, though passing it is not proof of understanding.',
        ar: 'حوّل تورينغ لغزًا فلسفيًا إلى اختبار عملي، لكن اجتيازه ليس دليلًا على الفهم.'
      },
      source: { title: 'Encyclopaedia Britannica — Turing test', url: 'https://www.britannica.com/technology/Turing-test' },
      quiz: {
        q: { en: 'What did Turing replace the question "Can machines think?" with?', ar: 'بماذا استبدل تورينغ سؤال: هل تستطيع الآلات أن تفكر؟' },
        options: {
          en: ['Whether a judge can tell a machine from a human in conversation', 'Whether a machine can calculate faster than a person', 'Whether a machine has a brain-like structure'],
          ar: ['هل يستطيع حَكَم أن يميز الآلة من الإنسان في محادثة', 'هل تحسب الآلة أسرع من الإنسان', 'هل للآلة بنية تشبه الدماغ']
        },
        answer: 0,
        explain: {
          en: 'The imitation game asks whether a hidden machine can be told apart from a human through typed conversation.',
          ar: 'تسأل لعبة المحاكاة هل يمكن تمييز آلة مخفية من إنسان عبر محادثة مكتوبة.'
        }
      }
    },
    {
      id: 'ta-03',
      title: { en: 'The Transistor and Moore\'s Law', ar: 'الترانزستور وقانون مور' },
      body: {
        en: `Early computers filled rooms with glowing vacuum tubes that ran hot and burned out. Then, in the late 1940s, researchers at Bell Labs demonstrated the transistor, a tiny switch made from semiconductor material that could turn current on or off with no moving parts. Engineers learned to pack ever more of them onto a single chip. In 1965 Gordon Moore observed that the number was roughly doubling at a steady pace, later stated as about every two years. Moore's law was never a law of nature, just a trend driven by engineering effort. In recent years it has slowed as transistors approach physical and economic limits.`,
        ar: `ملأت الحواسيب الأولى غرفًا كاملة بصمامات مفرغة متوهجة تسخن وتحترق باستمرار. ثم في أواخر الأربعينيات عرض باحثون في مختبرات بيل الترانزستور، وهو مفتاح صغير من مادة شبه موصلة يفتح التيار أو يغلقه دون أي أجزاء متحركة. وتعلّم المهندسون أن يضعوا أعدادًا متزايدة منه على شريحة واحدة. وفي عام ألف وتسعمئة وخمسة وستين لاحظ غوردون مور أن هذا العدد يتضاعف بوتيرة منتظمة، وصيغت الملاحظة لاحقًا على أنها تضاعف كل عامين تقريبًا. لم يكن قانون مور قانونًا طبيعيًا، بل اتجاهًا صنعه الجهد الهندسي، وقد تباطأ في السنوات الأخيرة مع اقتراب الترانزستورات من حدود فيزيائية واقتصادية.`
      },
      takeaway: {
        en: 'Moore\'s law was an engineering trend, not a law of physics, and it has slowed.',
        ar: 'قانون مور اتجاه هندسي لا قانون فيزيائي، وقد تباطأ.'
      },
      source: { title: 'Encyclopaedia Britannica — Transistor', url: 'https://www.britannica.com/technology/transistor' },
      quiz: {
        q: { en: 'What best describes Moore\'s law today?', ar: 'ما أدق وصف لقانون مور اليوم؟' },
        options: {
          en: ['A law of physics that can never change', 'A rule that chips get exactly twice as fast each year', 'An observed trend that has slowed in recent years'],
          ar: ['قانون فيزيائي لا يتغير أبدًا', 'قاعدة تقول إن الشرائح تتضاعف سرعتها كل عام بالضبط', 'اتجاه ملحوظ تباطأ في السنوات الأخيرة']
        },
        answer: 2,
        explain: {
          en: 'Moore described a trend in transistor counts driven by engineering, and progress has slowed as limits approach.',
          ar: 'وصف مور اتجاهًا في أعداد الترانزستورات يقوده الجهد الهندسي، وقد تباطأ التقدم مع اقتراب الحدود.'
        }
      }
    },
    {
      id: 'ta-04',
      title: { en: 'How a Message Crosses the Internet', ar: 'كيف تعبر الرسالة الإنترنت' },
      body: {
        en: `When you send a photo to a friend in another country, it does not travel as one piece. Your device chops it into small packets, each labelled with a destination address and a sequence number, like pages of a letter mailed in separate envelopes. Routers along the way read each address and pass the packet to a neighbour that seems closer to the goal. Different packets may take different paths and arrive out of order. At the other end, software reassembles them and asks for any missing ones to be sent again. Because no single route is essential, the network can work around broken links.`,
        ar: `حين ترسل صورة إلى صديق في بلد آخر، فإنها لا تسافر قطعة واحدة. يقسّمها جهازك إلى حزم صغيرة، تحمل كل منها عنوان الوجهة ورقمًا تسلسليًا، كأنها صفحات رسالة وُضعت كل واحدة في ظرف مستقل. وتقرأ أجهزة التوجيه على الطريق عنوان كل حزمة وتمررها إلى جار يبدو أقرب إلى الهدف. وقد تسلك الحزم طرقًا مختلفة وتصل بغير ترتيبها. وفي الطرف الآخر يعيد البرنامج تجميعها ويطلب إعادة إرسال ما فُقد منها. ولأنه لا يوجد طريق واحد لا غنى عنه، تستطيع الشبكة الالتفاف حول الوصلات المعطلة.`
      },
      takeaway: {
        en: 'The internet moves data as many addressed packets that find their own way and are reassembled.',
        ar: 'ينقل الإنترنت البيانات حزمًا كثيرة معنونة تجد طريقها ثم يُعاد تجميعها.'
      },
      source: { title: 'Wikipedia — Packet switching', url: 'https://en.wikipedia.org/wiki/Packet_switching' },
      quiz: {
        q: { en: 'Why can the internet keep working when one link breaks?', ar: 'لماذا يستمر الإنترنت في العمل إذا تعطلت وصلة واحدة؟' },
        options: {
          en: ['Each message has one fixed reserved cable', 'Packets can be routed along other paths', 'Broken links repair themselves instantly'],
          ar: ['لكل رسالة سلك ثابت محجوز لها', 'يمكن توجيه الحزم عبر مسارات أخرى', 'الوصلات المعطلة تصلح نفسها فورًا']
        },
        answer: 1,
        explain: {
          en: 'Routers forward packets hop by hop, so traffic can flow around a failed link.',
          ar: 'تمرر أجهزة التوجيه الحزم خطوة بخطوة، فتستطيع البيانات أن تلتف حول الوصلة المعطلة.'
        }
      }
    },
    {
      id: 'ta-05',
      title: { en: 'Locks Anyone Can Close', ar: 'أقفال يستطيع أي أحد إغلاقها' },
      body: {
        en: `Imagine handing out open padlocks to anyone who asks. A stranger can put a note in a box and snap your padlock shut, but only you hold the key that opens it. That is the core idea of public-key encryption. Each person has a pair of mathematically linked keys: a public key shared freely for locking, and a private key kept secret for unlocking. The system relies on maths problems that are easy to do in one direction but extremely hard to reverse, such as factoring huge numbers. This lets two people who have never met set up a secure connection, which is what happens behind the padlock icon in your browser.`,
        ar: `تخيّل أنك توزع أقفالًا مفتوحة على كل من يطلبها. يستطيع الغريب أن يضع رسالة في صندوق ويغلق قفلك عليه، لكنك وحدك تملك المفتاح الذي يفتحه. هذه هي الفكرة الجوهرية للتشفير بالمفتاح العام. فلكل شخص زوج من المفاتيح المرتبطة رياضيًا: مفتاح عام يُنشر بحرية للإغلاق، ومفتاح خاص يبقى سرًا للفتح. ويعتمد النظام على مسائل رياضية يسهل إجراؤها في اتجاه ويصعب جدًا عكسها، مثل تحليل الأعداد الضخمة إلى عواملها. وبذلك يستطيع شخصان لم يلتقيا قط إنشاء اتصال آمن، وهذا ما يحدث خلف رمز القفل في متصفحك.`
      },
      takeaway: {
        en: 'Public keys lock, private keys unlock, letting strangers communicate securely.',
        ar: 'المفتاح العام يغلق والمفتاح الخاص يفتح، فيتواصل الغرباء بأمان.'
      },
      source: { title: 'Wikipedia — Public-key cryptography', url: 'https://en.wikipedia.org/wiki/Public-key_cryptography' },
      quiz: {
        q: { en: 'In public-key encryption, which key must be kept secret?', ar: 'في التشفير بالمفتاح العام، أي مفتاح يجب أن يبقى سرًا؟' },
        options: {
          en: ['The public key', 'Both keys equally', 'The private key'],
          ar: ['المفتاح العام', 'المفتاحان بالقدر نفسه', 'المفتاح الخاص']
        },
        answer: 2,
        explain: {
          en: 'The public key is shared for locking; only the private key, kept secret, can unlock the message.',
          ar: 'يُنشر المفتاح العام للإغلاق، أما المفتاح الخاص السري فهو وحده القادر على فتح الرسالة.'
        }
      }
    },
    {
      id: 'ta-06',
      title: { en: 'Learning From Examples, Not Rules', ar: 'التعلم من الأمثلة لا من القواعد' },
      body: {
        en: `Try writing rules to spot junk email. Ban the word "free"? Real messages use it too. Spammers misspell words to slip past. The list of rules grows endless and still fails. Machine learning flips the approach. Instead of writing rules, programmers collect thousands of emails already labelled as spam or not, and let an algorithm find the patterns that separate them. The result is a model that can make predictions about new emails it has never seen. Its quality depends heavily on the examples: too few, outdated or unrepresentative, and the model learns the wrong lessons. Machine learning finds patterns; it does not understand meaning.`,
        ar: `جرّب أن تكتب قواعد لكشف البريد المزعج. هل تحظر كلمة مجاني؟ الرسائل الحقيقية تستخدمها أيضًا. ومرسلو الرسائل المزعجة يحرّفون الكلمات ليتسللوا. فتطول قائمة القواعد بلا نهاية وتظل تخفق. يقلب تعلم الآلة هذا النهج: فبدل كتابة القواعد، يجمع المبرمجون آلاف الرسائل المصنفة مسبقًا بين مزعجة وسليمة، ويتركون خوارزمية تكتشف الأنماط التي تفرّق بينها. والنتيجة نموذج يتنبأ بحال رسائل جديدة لم يرها من قبل. وتعتمد جودته كثيرًا على الأمثلة: فإن كانت قليلة أو قديمة أو غير ممثِّلة، تعلّم دروسًا خاطئة. إن تعلم الآلة يجد الأنماط، لكنه لا يفهم المعنى.`
      },
      takeaway: {
        en: 'Machine learning finds patterns in labelled examples, so the examples decide what it learns.',
        ar: 'يكتشف تعلم الآلة الأنماط في أمثلة مصنفة، فالأمثلة هي التي تحدد ما يتعلمه.'
      },
      source: { title: 'Wikipedia — Machine learning', url: 'https://en.wikipedia.org/wiki/Machine_learning' },
      quiz: {
        q: { en: 'How does a machine-learning spam filter mainly get its abilities?', ar: 'من أين يكتسب مرشح البريد المزعج القائم على تعلم الآلة قدراته أساسًا؟' },
        options: {
          en: ['By finding patterns in many labelled examples', 'By following a long list of hand-written rules', 'By understanding the meaning of each email'],
          ar: ['باكتشاف الأنماط في أمثلة كثيرة مصنفة', 'باتباع قائمة طويلة من القواعد المكتوبة يدويًا', 'بفهم معنى كل رسالة']
        },
        answer: 0,
        explain: {
          en: 'Machine learning replaces hand-written rules with patterns learned from labelled data.',
          ar: 'يستبدل تعلم الآلة بالقواعد المكتوبة يدويًا أنماطًا يتعلمها من بيانات مصنفة.'
        }
      }
    },
    {
      id: 'ta-07',
      title: { en: 'Inside a Neural Network', ar: 'داخل الشبكة العصبية' },
      body: {
        en: `Think of a vast mixing desk with millions of tiny dials. Sound goes in, passes through layer after layer of dials, and comes out the other side. That is roughly how an artificial neural network works. Numbers flow through layers of simple units, and each connection has a weight, like a dial setting. At first the weights are random, so the answers are nonsense. During training, the network compares its output with the correct answer, measures the error, and nudges every weight slightly in the direction that reduces it. Repeated across huge numbers of examples, these small adjustments add up to a system that recognises faces, speech or handwriting.`,
        ar: `تخيّل لوحة مزج صوتي هائلة فيها ملايين المقابض الصغيرة. يدخل الصوت ويمر عبر طبقة بعد طبقة من المقابض ثم يخرج من الجهة الأخرى. هكذا تعمل الشبكة العصبية الاصطناعية على وجه التقريب. تتدفق الأعداد عبر طبقات من وحدات بسيطة، ولكل وصلة وزن يشبه وضع المقبض. في البداية تكون الأوزان عشوائية فتخرج الإجابات بلا معنى. وأثناء التدريب تقارن الشبكة ناتجها بالإجابة الصحيحة، وتقيس الخطأ، ثم تحرك كل وزن قليلًا في الاتجاه الذي يقلله. ومع تكرار ذلك على أعداد هائلة من الأمثلة، تتراكم هذه التعديلات الصغيرة لتنتج نظامًا يتعرف على الوجوه أو الكلام أو خط اليد.`
      },
      takeaway: {
        en: 'Training a neural network means nudging many weights, step by step, to shrink its errors.',
        ar: 'تدريب الشبكة العصبية يعني تعديل أوزان كثيرة خطوة بخطوة لتقليل أخطائها.'
      },
      source: { title: 'Wikipedia — Artificial neural network', url: 'https://en.wikipedia.org/wiki/Artificial_neural_network' },
      quiz: {
        q: { en: 'What changes inside a neural network during training?', ar: 'ما الذي يتغير داخل الشبكة العصبية أثناء التدريب؟' },
        options: {
          en: ['The number of layers doubles each round', 'The connection weights are adjusted to reduce error', 'The training examples are rewritten'],
          ar: ['يتضاعف عدد الطبقات في كل جولة', 'تُعدَّل أوزان الوصلات لتقليل الخطأ', 'تُعاد كتابة أمثلة التدريب']
        },
        answer: 1,
        explain: {
          en: 'Training measures the error and nudges the weights in the direction that makes it smaller.',
          ar: 'يقيس التدريب الخطأ ثم يحرك الأوزان في الاتجاه الذي يجعله أصغر.'
        }
      }
    },
    {
      id: 'ta-08',
      title: { en: 'Fluent Is Not the Same as True', ar: 'الطلاقة ليست هي الصدق' },
      body: {
        en: `A student asks a chatbot for sources on a history essay. It replies with neat, confident references, complete with authors and titles. Several turn out not to exist. This is a well-known weakness of large language models. They are trained on vast amounts of text to predict which word, or piece of a word, is likely to come next. That skill produces remarkably fluent writing, summaries and code. But predicting plausible text is not the same as checking facts, so the model can state errors with complete confidence, often called hallucinations. These tools can be genuinely useful, provided important claims are verified against reliable sources.`,
        ar: `يطلب طالب من روبوت محادثة مراجع لمقال في التاريخ، فيرد بقائمة أنيقة واثقة من المراجع بأسماء مؤلفيها وعناوينها، ثم يتبين أن عددًا منها غير موجود أصلًا. هذا ضعف معروف في النماذج اللغوية الكبيرة. فهي تُدرَّب على كميات هائلة من النصوص لتتنبأ بالكلمة، أو جزء الكلمة، الأرجح أن يأتي بعد ذلك. وتنتج هذه المهارة كتابة وتلخيصًا وشيفرة برمجية بطلاقة لافتة. لكن التنبؤ بنص معقول ليس هو التحقق من الحقائق، لذا قد يقدم النموذج أخطاء بثقة تامة، وهو ما يسمى الهلوسة. يمكن أن تكون هذه الأدوات مفيدة فعلًا، بشرط التحقق من الادعاءات المهمة في مصادر موثوقة.`
      },
      takeaway: {
        en: 'Language models predict likely text, so verify important facts they produce.',
        ar: 'النماذج اللغوية تتنبأ بالنص المرجح، فتحقق من الحقائق المهمة التي تقدمها.'
      },
      source: { title: 'Wikipedia — Large language model', url: 'https://en.wikipedia.org/wiki/Large_language_model' },
      quiz: {
        q: { en: 'Why can a large language model invent a fake reference?', ar: 'لماذا قد يختلق نموذج لغوي كبير مرجعًا غير موجود؟' },
        options: {
          en: ['It deliberately tries to deceive users', 'It copies errors only from one bad website', 'It predicts plausible text rather than checking facts'],
          ar: ['لأنه يتعمد خداع المستخدمين', 'لأنه ينسخ الأخطاء من موقع سيئ واحد فقط', 'لأنه يتنبأ بنص معقول بدل التحقق من الحقائق']
        },
        answer: 2,
        explain: {
          en: 'The model generates likely-sounding text; nothing in that process guarantees the content is true.',
          ar: 'يولّد النموذج نصًا يبدو مرجحًا، ولا شيء في هذه العملية يضمن صحة المحتوى.'
        }
      }
    },
    {
      id: 'ta-09',
      title: { en: 'When Data Carries Old Bias', ar: 'حين تحمل البيانات تحيزًا قديمًا' },
      body: {
        en: `Suppose a company trains a model to screen job applications using a decade of its past hiring decisions. If those decisions favoured one group, the model may quietly learn to do the same, even if no one programmed it to. This is algorithmic bias: systems absorb patterns from historical data, including unfair ones. Researchers have also found that some face-recognition systems performed worse on people underrepresented in their training images. Responsible AI practice means checking who is in the data, testing results across different groups, explaining how decisions are made, and keeping humans accountable for important outcomes. A model is only as fair as its data and design.`,
        ar: `لنفترض أن شركة درّبت نموذجًا لفرز طلبات التوظيف اعتمادًا على قرارات التعيين لديها خلال عقد كامل. فإن كانت تلك القرارات قد فضّلت فئة معينة، فقد يتعلم النموذج بصمت أن يفعل الشيء نفسه، مع أن أحدًا لم يبرمجه على ذلك. هذا هو التحيز الخوارزمي: تمتص الأنظمة الأنماط من البيانات التاريخية، بما فيها الأنماط الظالمة. وقد وجد باحثون أيضًا أن بعض أنظمة التعرف على الوجوه كان أداؤها أضعف مع فئات قلّ تمثيلها في صور التدريب. وتعني الممارسة المسؤولة للذكاء الاصطناعي فحص من تمثلهم البيانات، واختبار النتائج عبر فئات مختلفة، وتوضيح طريقة اتخاذ القرارات، وإبقاء البشر مسؤولين عن النتائج المهمة.`
      },
      takeaway: {
        en: 'AI can inherit unfairness from its data, so it must be tested and overseen by people.',
        ar: 'قد يرث الذكاء الاصطناعي الظلم من بياناته، فلا بد من اختباره وإشراف البشر عليه.'
      },
      source: { title: 'Wikipedia — Algorithmic bias', url: 'https://en.wikipedia.org/wiki/Algorithmic_bias' },
      quiz: {
        q: { en: 'How can a hiring model become biased without anyone programming it to?', ar: 'كيف يصبح نموذج التوظيف متحيزًا دون أن يبرمجه أحد على ذلك؟' },
        options: {
          en: ['By learning patterns from biased past decisions', 'By running on a slow computer', 'By receiving too few job applications'],
          ar: ['بتعلم الأنماط من قرارات سابقة متحيزة', 'بالعمل على حاسوب بطيء', 'بتلقي عدد قليل جدًا من طلبات التوظيف']
        },
        answer: 0,
        explain: {
          en: 'Models learn from historical data, so unfair patterns in past decisions can be reproduced.',
          ar: 'تتعلم النماذج من البيانات التاريخية، فقد تعيد إنتاج الأنماط الظالمة في القرارات السابقة.'
        }
      }
    },
    {
      id: 'ta-10',
      title: { en: 'Passwords and a Second Lock', ar: 'كلمات المرور وقفل ثانٍ' },
      body: {
        en: `A man reuses the same password on a small shopping site and his email. The shop is breached, and within days someone is reading his inbox. Attackers routinely try leaked passwords on many other sites, so reuse turns one leak into many. Two habits help a great deal. First, use long, unique passwords for each account, which a password manager makes practical. Second, turn on two-factor authentication, which asks for something you know, your password, plus something you have, such as a code from an app or a security key. Even if a password is stolen, the thief usually still lacks the second factor.`,
        ar: `يستخدم رجل كلمة المرور نفسها في موقع تسوق صغير وفي بريده الإلكتروني. يتعرض المتجر للاختراق، وخلال أيام يصبح شخص غريب يقرأ رسائله. فالمهاجمون يجربون كلمات المرور المسربة على مواقع أخرى كثيرة بصورة روتينية، فيتحول تسريب واحد إلى اختراقات عديدة. وتساعد عادتان كثيرًا: الأولى أن تستخدم كلمة مرور طويلة وفريدة لكل حساب، ويجعل مدير كلمات المرور ذلك عمليًا. والثانية أن تفعّل المصادقة الثنائية، التي تطلب شيئًا تعرفه وهو كلمة المرور، وشيئًا تملكه مثل رمز من تطبيق أو مفتاح أمان. وحتى لو سُرقت كلمة المرور، فإن السارق غالبًا لا يملك العامل الثاني.`
      },
      takeaway: {
        en: 'Use a unique password for every account and switch on two-factor authentication.',
        ar: 'استخدم كلمة مرور فريدة لكل حساب وفعّل المصادقة الثنائية.'
      },
      source: { title: 'Wikipedia — Multi-factor authentication', url: 'https://en.wikipedia.org/wiki/Multi-factor_authentication' },
      quiz: {
        q: { en: 'Why is reusing one password across sites risky?', ar: 'لماذا يُعد استخدام كلمة مرور واحدة في عدة مواقع أمرًا خطرًا؟' },
        options: {
          en: ['Sites slowly weaken reused passwords', 'A leak from one site lets attackers try it everywhere', 'Reused passwords disable two-factor authentication'],
          ar: ['لأن المواقع تُضعف كلمات المرور المكررة تدريجيًا', 'لأن تسريبها من موقع واحد يتيح للمهاجمين تجربتها في كل مكان', 'لأن تكرارها يعطل المصادقة الثنائية']
        },
        answer: 1,
        explain: {
          en: 'Attackers test leaked passwords on other services, so one breach can unlock many accounts.',
          ar: 'يجرب المهاجمون كلمات المرور المسربة على خدمات أخرى، فقد يفتح اختراق واحد حسابات كثيرة.'
        }
      }
    }
  ]
});
