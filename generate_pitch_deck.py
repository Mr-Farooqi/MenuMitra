import os
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

# Landscape letter: 792 wide x 612 tall
PAGE_W = 792
PAGE_H = 612

def draw_slide_decorations(canvas, doc):
    canvas.saveState()
    
    # 1. Top Brand Banner
    canvas.setFillColor(colors.HexColor("#0f172a")) # Rich Slate 900
    canvas.rect(0, 568, PAGE_W, 44, stroke=0, fill=1)
    
    # Accent colored line under top banner (Google 4-color gradient effect)
    canvas.setFillColor(colors.HexColor("#4285F4")) # Google Blue
    canvas.rect(0, 564, 198, 4, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#EA4335")) # Google Red
    canvas.rect(198, 564, 198, 4, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#FBBC05")) # Google Yellow
    canvas.rect(396, 564, 198, 4, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#34A853")) # Google Green
    canvas.rect(594, 564, 198, 4, stroke=0, fill=1)
    
    # Header Brand Text
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(36, 584, "MenuMitra AI")
    
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#94a3b8"))
    canvas.drawString(125, 584, "|   Next-Gen Restaurant OS")
    
    # Header Right Badge
    canvas.setFillColor(colors.HexColor("#1e293b"))
    canvas.roundRect(505, 574, 252, 22, 6, stroke=1, fill=1)
    canvas.setFillColor(colors.HexColor("#38bdf8"))
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.drawRightString(747, 581, "GOOGLE DEEPMIND | GOOGLE CLOUD 2026")

    # 2. Bottom Footer Bar
    canvas.setFillColor(colors.HexColor("#f8fafc"))
    canvas.rect(0, 0, PAGE_W, 30, stroke=0, fill=1)
    canvas.setStrokeColor(colors.HexColor("#e2e8f0"))
    canvas.setLineWidth(1)
    canvas.line(0, 30, PAGE_W, 30)

    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(36, 11, "Confidential • Mohammad.Adil (Faruqui) • Founder & Lead Architect • MenuMitra AI")
    
    # Slide Number Badge
    canvas.setFillColor(colors.HexColor("#0f172a"))
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.drawRightString(756, 11, f"Slide {doc.page} of 6")

    canvas.restoreState()

def build_deck_pdf(output_filename):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=58,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom Typography
    title_hero = ParagraphStyle(
        'HeroTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0f172a")
    )

    tagline_hero = ParagraphStyle(
        'HeroTagline',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=14.5,
        textColor=colors.HexColor("#475569")
    )

    slide_heading = ParagraphStyle(
        'SlideHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a")
    )

    slide_subheading = ParagraphStyle(
        'SlideSubheading',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#64748b")
    )

    card_h = ParagraphStyle(
        'CardH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12.5,
        textColor=colors.HexColor("#0f172a")
    )

    card_p = ParagraphStyle(
        'CardP',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#334155")
    )

    card_bold = ParagraphStyle(
        'CardBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#1e293b")
    )

    stat_num = ParagraphStyle(
        'StatNum',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#2563eb")
    )

    story = []

    # =========================================================================
    # SLIDE 1: COVER SLIDE
    # =========================================================================
    story.append(Spacer(1, 10))
    
    # Category Pill
    pill_data = [[
        Paragraph("<font color='#2563eb'><b>STARTUP BUILDATHON 2026</b></font> &nbsp;•&nbsp; <font color='#475569'>B2B SaaS / Generative AI Track</font>", ParagraphStyle('Pill', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=10))
    ]]
    pill_t = Table(pill_data, colWidths=[310])
    pill_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#eff6ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#bfdbfe")),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(pill_t)
    story.append(Spacer(1, 8))

    story.append(Paragraph("MenuMitra AI — Empowering Indian Restaurants", title_hero))
    story.append(Spacer(1, 4))
    story.append(Paragraph("The All-in-One Restaurant Operating System: <b>Zero-Commission UPI QR Ordering</b>, <b>Dynamic PIN Waiter Station</b>, and <b>Google Gemini 1.5 Flash</b> Gamified Review Intelligence.", tagline_hero))
    story.append(Spacer(1, 14))

    # 4 Pillar Feature Boxes
    p1 = Paragraph("<b>⚡ 0% Commission Direct UPI</b><br/><font color='#475569'>Diners scan table QR, customize food, and pay directly to restaurant bank via instant UPI.</font>", card_p)
    p2 = Paragraph("<b>🔑 4-Digit PIN Waiter Station</b><br/><font color='#475569'>Waiters manage floor orders, collect cash, and print thermal KOT bills with zero POS hardware.</font>", card_p)
    p3 = Paragraph("<b>🛡️ Gemini Vision Review Audit</b><br/><font color='#475569'>Multimodal AI verifies Google Maps 5-star screenshots to eliminate fake discount claims.</font>", card_p)
    p4 = Paragraph("<b>👨‍🍳 Mitra Chef AI Concierge</b><br/><font color='#475569'>In-menu culinary assistant recommending food pairings & Hindi/regional language translation.</font>", card_p)

    feature_grid = [
        [p1, p2],
        [p3, p4]
    ]
    fg_table = Table(feature_grid, colWidths=[352, 352])
    fg_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), colors.HexColor("#f8fafc")),
        ('BACKGROUND', (1,0), (1,0), colors.HexColor("#f8fafc")),
        ('BACKGROUND', (0,1), (0,1), colors.HexColor("#faf5ff")),
        ('BACKGROUND', (1,1), (1,1), colors.HexColor("#f0fdf4")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 9),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(fg_table)
    story.append(Spacer(1, 14))

    # Founder Info Box
    founder_box = [
        [
            Paragraph("<b>FOUNDER & LEAD ARCHITECT</b><br/><font size='10'><b>Mohammad.Adil (Faruqui)</b></font><br/><font color='#64748b' size='8'>Full-Stack Software Engineer & Product Builder</font>", card_p),
            Paragraph("<b>TECH ARCHITECTURE</b><br/>Next.js 14 App Router, Neon PostgreSQL, Prisma ORM, Google Gemini 1.5 Flash SDK, Google Cloud Run", card_p),
            Paragraph("<b>PROJECT STATUS</b><br/><font color='#16a34a'><b>✔ Production Ready (27/27 Routes)</b></font><br/><font color='#64748b'>Full-featured multi-tenant SaaS MVP</font>", card_p)
        ]
    ]
    fb_table = Table(founder_box, colWidths=[234, 254, 216])
    fb_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.white),
        ('PADDING', (0,0), (-1,-1), 9),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(fb_table)
    story.append(PageBreak())

    # =========================================================================
    # SLIDE 2: THE PROBLEM IN BHARAT'S RESTAURANTS
    # =========================================================================
    story.append(Spacer(1, 4))
    story.append(Paragraph("Market Problem — The Struggles of SMB Indian Restaurants", slide_heading))
    story.append(Paragraph("Small & medium eateries lose margins to third-party monopolies, battle paper chaos, and lack local Google discovery.", slide_subheading))
    story.append(Spacer(1, 12))

    prob_cards = [
        [
            Paragraph("<font color='#b91c1c'><b>PROBLEM 01</b></font><br/><b>Aggregator Commission Tax</b>", card_h),
            Paragraph("<font color='#b91c1c'><b>PROBLEM 02</b></font><br/><b>Floor Chaos & Costly POS</b>", card_h),
            Paragraph("<font color='#b91c1c'><b>PROBLEM 03</b></font><br/><b>Missing Google Footfall</b>", card_h)
        ],
        [
            Paragraph("<b>25%–35% Margins Lost:</b> Aggregators like Swiggy & Zomato charge exorbitant commissions. Restaurants have no direct relationship with dine-in guests and lose repeat customer data.", card_p),
            Paragraph("<b>₹30,000+ Hardware Cost:</b> Traditional POS terminals are expensive with annual AMC fees. Hand-written KOT paper slips get lost, causing delays, order mix-ups, and kitchen disputes.", card_p),
            Paragraph("<b>Fake Reviews & Low Ratings:</b> Over 85% of local diners choose restaurants via Google Maps, but asking for reviews manually yields <2%. Fraudulent diners upload fake screenshots for discounts.", card_p)
        ],
        [
            Paragraph("<b>Impact:</b> Net margins shrink below 8%, forcing independent food joints to shut down.", card_bold),
            Paragraph("<b>Impact:</b> Slow table turnover during rush hours; frustrated guests and staff churn.", card_bold),
            Paragraph("<b>Impact:</b> Zero local SEO visibility; food businesses remain invisible on Google Search.", card_bold)
        ]
    ]
    pt_table = Table(prob_cards, colWidths=[234, 234, 236])
    pt_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#fee2e2")),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#fff1f2")),
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor("#fee2e2")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#fca5a5")),
        ('INNERGRID', (0,0), (-1,-1), 1, colors.HexColor("#fecaca")),
        ('PADDING', (0,0), (-1,-1), 9),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(pt_table)
    story.append(Spacer(1, 14))

    # Market Stat Strip
    stats_data = [
        [
            Paragraph("<font color='#b91c1c'><b>30 Million+</b></font><br/><font size='8' color='#475569'>Food Outlets in India</font>", card_h),
            Paragraph("<font color='#b91c1c'><b>₹3.5 Lakh Cr</b></font><br/><font size='8' color='#475569'>Indian Dine-In F&B Market</font>", card_h),
            Paragraph("<font color='#b91c1c'><b>80%+</b></font><br/><font size='8' color='#475569'>Operating on Paper / Basic Billing</font>", card_h),
            Paragraph("<font color='#b91c1c'><b>₹1,200 Cr</b></font><br/><font size='8' color='#475569'>Serviceable SaaS Market (SAM)</font>", card_h)
        ]
    ]
    st_table = Table(stats_data, colWidths=[176, 176, 176, 176])
    st_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(st_table)
    story.append(PageBreak())

    # =========================================================================
    # SLIDE 3: THE SOLUTION — MENUMITRA AI
    # =========================================================================
    story.append(Spacer(1, 4))
    story.append(Paragraph("The Solution — Modern Cloud-Native Restaurant Operating System", slide_heading))
    story.append(Paragraph("MenuMitra replaces fragmented hardware and high commissions with an integrated mobile-first platform.", slide_subheading))
    story.append(Spacer(1, 12))

    sol_cards = [
        [
            Paragraph("<font color='#15803d'><b>FEATURE 01</b></font><br/><b>Contactless Table QR & UPI</b>", card_h),
            Paragraph("<font color='#15803d'><b>FEATURE 02</b></font><br/><b>Dynamic PIN Waiter Station</b>", card_h),
            Paragraph("<font color='#15803d'><b>FEATURE 03</b></font><br/><b>Google Reviews Gamification</b>", card_h)
        ],
        [
            Paragraph("• High-resolution digital menu with food badges & dietary tags.<br/>• Direct-to-table ordering with special cooking requests.<br/>• Dynamic instant UPI QR code generation (GPay, PhonePe, Paytm).<br/>• 0% commission direct to merchant bank.", card_p),
            Paragraph("• Dedicated mobile portal protected by dynamic 4-digit PIN.<br/>• Table-wise active order filters and real-time live status.<br/>• Waiters record cash/UPI payments and redeem coupons on the fly.<br/>• Order serving strictly locked until payment is verified.", card_p),
            Paragraph("• Post-meal gamified scratch cards rewarding Google Reviews.<br/>• Configurable discount rules (e.g. 15% off, free dessert).<br/>• Unique encrypted coupon code with atomic POS redemption.<br/>• Customers live-poll status to reveal rewards instantly.", card_p)
        ],
        [
            Paragraph("<font color='#15803d'><b>Result:</b></font> 40% faster order turnaround & zero commission loss.", card_bold),
            Paragraph("<font color='#15803d'><b>Result:</b></font> Eliminates ₹30K POS machines; zero waiter billing errors.", card_bold),
            Paragraph("<font color='#15803d'><b>Result:</b></font> 10x organic 5-star Google Maps reviews & footfall.", card_bold)
        ]
    ]
    sol_table = Table(sol_cards, colWidths=[234, 234, 236])
    sol_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#dcfce7")),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#f0fdf4")),
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor("#dcfce7")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#86efac")),
        ('INNERGRID', (0,0), (-1,-1), 1, colors.HexColor("#bbf7d0")),
        ('PADDING', (0,0), (-1,-1), 9),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(sol_table)
    story.append(Spacer(1, 14))

    # 3 Value Pillars
    vp_data = [
        [
            Paragraph("<b>0% Commission Guarantee</b><br/><font color='#64748b' size='8'>Restaurants keep 100% of their earnings with instant settlements.</font>", card_p),
            Paragraph("<b>100% Smartphone Compatible</b><br/><font color='#64748b' size='8'>Zero hardware required; runs smoothly in modern mobile browsers.</font>", card_p),
            Paragraph("<b>Thermal Printing Ready</b><br/><font color='#64748b' size='8'>1-click 58mm/80mm thermal receipt printing for kitchen KOTs & billing.</font>", card_p)
        ]
    ]
    vp_table = Table(vp_data, colWidths=[234, 234, 236])
    vp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(vp_table)
    story.append(PageBreak())

    # =========================================================================
    # SLIDE 4: GOOGLE DEEPMIND & GEMINI AI INNOVATION
    # =========================================================================
    story.append(Spacer(1, 4))
    story.append(Paragraph("Google DeepMind & Gemini 1.5 Flash AI Innovation", slide_heading))
    story.append(Paragraph("Transforming dining operations through multimodal vision, natural language culinary concierge, and auto-responders.", slide_subheading))
    story.append(Spacer(1, 12))

    gemini_cards = [
        [
            Paragraph("<font color='#6d28d9'><b>MULTIMODAL VISION</b></font><br/><b>Gemini 1.5 Flash Fraud Detection</b>", card_h),
            Paragraph("<font color='#6d28d9'><b>CULINARY CONCIERGE</b></font><br/><b>'Mitra Chef AI' Assistant</b>", card_h),
            Paragraph("<font color='#6d28d9'><b>OWNER PRODUCTIVITY</b></font><br/><b>AI Reply & Menu Copywriter</b>", card_h)
        ],
        [
            Paragraph("• Analyzes uploaded customer review screenshots using multimodal vision.<br/>• Verifies genuine Google Maps review UI, star ratings (4-5 stars), and restaurant name matching.<br/>• Flags fraudulent uploads, selfies, and memes automatically.<br/>• Displays AI confidence badge (e.g. 96%) in Owner Dashboard.", card_p),
            Paragraph("• Embedded culinary concierge on customer digital menu (`/m/[slug]`).<br/>• Diners ask natural language questions (e.g., 'Best spicy starters under ₹250').<br/>• Gemini analyzes live active menu items to recommend delicious food pairings.<br/>• Full Hindi/regional language translation for Bharat diners.", card_p),
            Paragraph("• 1-Click AI Review Reply generator in `/dashboard/reviews`: drafts warm, professional, authentic Google Maps replies.<br/>• AI Menu Item Enhancer in `/dashboard/menu`: generates appetizing descriptions and trending badges (Bestseller, Creamy) with 1 click.<br/>• Powered by `@google/generative-ai` SDK.", card_p)
        ]
    ]
    gemini_table = Table(gemini_cards, colWidths=[234, 234, 236])
    gemini_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#ede9fe")),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#faf5ff")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#c4b5fd")),
        ('INNERGRID', (0,0), (-1,-1), 1, colors.HexColor("#ddd6fe")),
        ('PADDING', (0,0), (-1,-1), 9),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(gemini_table)
    story.append(Spacer(1, 14))

    # Architecture Pipeline Diagram
    arch_flow = [
        [
            Paragraph("<b>CUSTOMER UPLOAD</b><br/><font size='8' color='#475569'>Google Review Screenshot</font>", card_p),
            Paragraph("<b>→</b>", stat_num),
            Paragraph("<b>GEMINI 1.5 FLASH VISION</b><br/><font size='8' color='#6d28d9'>Multimodal OCR & Sentiment</font>", card_p),
            Paragraph("<b>→</b>", stat_num),
            Paragraph("<b>AI VERDICT & CONFIDENCE</b><br/><font size='8' color='#16a34a'>Authentic 5-Star (96%)</font>", card_p),
            Paragraph("<b>→</b>", stat_num),
            Paragraph("<b>ATOMIC COUPON MINT</b><br/><font size='8' color='#d97706'>Active Scratch Card Reward</font>", card_p),
        ]
    ]
    arch_table = Table(arch_flow, colWidths=[150, 24, 170, 24, 160, 24, 152])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(arch_table)
    story.append(PageBreak())

    # =========================================================================
    # SLIDE 5: BUSINESS MODEL & MONETIZATION
    # =========================================================================
    story.append(Spacer(1, 4))
    story.append(Paragraph("Business Model & Tiered SaaS Monetization", slide_heading))
    story.append(Paragraph("Predictable recurring subscription revenue with 85%+ gross margins and rapid merchant payback.", slide_subheading))
    story.append(Spacer(1, 12))

    tier_cards = [
        [
            Paragraph("<font color='#d97706'><b>STARTER</b></font><br/><b>BASIC PLAN</b><br/><font size='14' color='#0f172a'><b>₹499</b></font><font size='8' color='#64748b'> / Month</font>", card_h),
            Paragraph("<font color='#2563eb'><b>GROWTH</b></font><br/><b>STANDARD PLAN</b><br/><font size='14' color='#0f172a'><b>₹1,499</b></font><font size='8' color='#64748b'> / Month</font>", card_h),
            Paragraph("<font color='#7c3aed'><b>RECOMMENDED</b></font><br/><b>PREMIUM PLAN</b><br/><font size='14' color='#0f172a'><b>₹2,999</b></font><font size='8' color='#64748b'> / Month</font>", card_h)
        ],
        [
            Paragraph("• Contactless Digital QR Menu<br/>• Table Management System<br/>• Branded Restaurant Public Site<br/>• Unlimited Menu Items & Tags<br/>• Direct UPI payments", card_p),
            Paragraph("• Everything in Basic +<br/>• Online Table Ordering<br/>• Live Kitchen Kanban & KOT<br/>• Dynamic PIN Waiter Station<br/>• Thermal Receipt Printing<br/>• Table billing settlements", card_p),
            Paragraph("• Everything in Standard +<br/>• Gamified Google Review Rewards<br/>• Gemini 1.5 Flash Vision Fraud Check<br/>• 'Mitra Chef AI' Menu Concierge<br/>• 1-Click AI Review Reply Generator<br/>• Multi-outlet analytics", card_p)
        ],
        [
            Paragraph("<b>Target:</b> Small Dhabas, Chai/Snack Outlets", card_bold),
            Paragraph("<b>Target:</b> Casual Dining, Cafes, Cloud Kitchens", card_bold),
            Paragraph("<b>Target:</b> High-volume Fine Dine, Restaurant Chains", card_bold)
        ]
    ]
    tier_table = Table(tier_cards, colWidths=[234, 234, 236])
    tier_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), colors.HexColor("#fef3c7")),
        ('BACKGROUND', (1,0), (1,0), colors.HexColor("#dbeafe")),
        ('BACKGROUND', (2,0), (2,0), colors.HexColor("#ede9fe")),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#ffffff")),
        ('BACKGROUND', (0,2), (0,2), colors.HexColor("#fef3c7")),
        ('BACKGROUND', (1,2), (1,2), colors.HexColor("#dbeafe")),
        ('BACKGROUND', (2,2), (2,2), colors.HexColor("#ede9fe")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 9),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(tier_table)
    story.append(Spacer(1, 14))

    # Unit Economics Strip
    econ_data = [
        [
            Paragraph("<b>₹1,800</b><br/><font size='8' color='#64748b'>Blended ARPU / Month</font>", card_h),
            Paragraph("<b>₹1,500</b><br/><font size='8' color='#64748b'>Customer Acquisition Cost (CAC)</font>", card_h),
            Paragraph("<b>< 1 Month</b><br/><font size='8' color='#64748b'>CAC Payback Period</font>", card_h),
            Paragraph("<b>₹21,600</b><br/><font size='8' color='#64748b'>Annual Customer LTV</font>", card_h)
        ]
    ]
    ec_table = Table(econ_data, colWidths=[176, 176, 176, 176])
    ec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(ec_table)
    story.append(PageBreak())

    # =========================================================================
    # SLIDE 6: TECH ARCHITECTURE & EXECUTION ROADMAP
    # =========================================================================
    story.append(Spacer(1, 4))
    story.append(Paragraph("Technical Architecture, Google Cloud Stack & Execution", slide_heading))
    story.append(Paragraph("Engineered on serverless cloud standards with verified type-safety and production performance.", slide_subheading))
    story.append(Spacer(1, 12))

    tech_matrix = [
        [
            Paragraph("<b>LAYER</b>", card_h),
            Paragraph("<b>TECHNOLOGY STACK</b>", card_h),
            Paragraph("<b>PURPOSE & ADVANTAGE</b>", card_h)
        ],
        [
            Paragraph("<b>Frontend & UI</b>", card_bold),
            Paragraph("Next.js 14 (App Router), React 18, Tailwind CSS, Lucide", card_p),
            Paragraph("Server Components, instantaneous mobile QR loading under 1.2s", card_p)
        ],
        [
            Paragraph("<b>Backend & ORM</b>", card_bold),
            Paragraph("TypeScript 5 (Strict), Prisma ORM 5.22, Zod Validation", card_p),
            Paragraph("100% type-safe API route handlers; zero runtime type crashes", card_p)
        ],
        [
            Paragraph("<b>Database</b>", card_bold),
            Paragraph("Neon Cloud Serverless PostgreSQL (Dual pooled/direct)", card_p),
            Paragraph("Auto-scaling relational storage with instant connection pooling", card_p)
        ],
        [
            Paragraph("<b>AI Infrastructure</b>", card_bold),
            Paragraph("Google Gemini 1.5 Flash, `@google/generative-ai`, AI Studio", card_p),
            Paragraph("High-speed multimodal image OCR and natural language menu concierge", card_p)
        ],
        [
            Paragraph("<b>Cloud Deployment</b>", card_bold),
            Paragraph("Google Cloud Run, Google Cloud SQL, Cloud Storage CDN", card_p),
            Paragraph("Serverless auto-scaling from 0 to 100k requests with regional India low latency", card_p)
        ]
    ]
    tm_table = Table(tech_matrix, colWidths=[130, 270, 304])
    tm_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#ffffff")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0,0), (-1,-1), 7),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(tm_table)
    story.append(Spacer(1, 14))

    # Execution Summary Box
    exec_summary = [
        [
            Paragraph("<b>FOUNDER & BUILDER:</b> <b>Mohammad.Adil (Faruqui)</b> &nbsp;•&nbsp; <b>CODEBASE:</b> 27/27 Production Routes & APIs Tested & Verified &nbsp;•&nbsp; <b>SUBMISSION:</b> Google DeepMind | Google Cloud Startup Buildathon India 2026", ParagraphStyle('ExecSummary', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=colors.HexColor("#1e1b4b")))
        ]
    ]
    ex_table = Table(exec_summary, colWidths=[704])
    ex_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fef3c7")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#f59e0b")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(ex_table)

    doc.build(story, onFirstPage=draw_slide_decorations, onLaterPages=draw_slide_decorations)
    print(f"[SUCCESS] Compiled high-design pitch deck: {output_filename}")

if __name__ == "__main__":
    out_file = r"C:\Users\Aadil\Desktop\MenuMitra_Pitch_Deck.pdf"
    build_deck_pdf(out_file)
