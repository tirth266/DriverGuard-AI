"""
PDF Ride Report generation.
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from io import BytesIO

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.piecharts import Pie
from reportlab.lib.colors import Color


def generate_ride_report(ride_data: Dict[str, Any]) -> bytes:
    """Generate a PDF ride report from ride data."""
    buffer = BytesIO()
    
    # Create document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        leading=28,
        textColor=HexColor('#1a1a2e'),
        spaceAfter=6,
        alignment=TA_CENTER,
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        leading=16,
        textColor=HexColor('#4a4a6a'),
        spaceAfter=20,
        alignment=TA_CENTER,
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        textColor=HexColor('#1a1a2e'),
        spaceBefore=16,
        spaceAfter=8,
        borderWidth=0,
        borderPadding=0,
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=HexColor('#333333'),
        spaceAfter=6,
    )
    
    small_style = ParagraphStyle(
        'CustomSmall',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=HexColor('#666666'),
        spaceAfter=4,
    )
    
    # Colors
    primary_color = HexColor('#1a1a2e')
    accent_color = HexColor('#00d4aa')
    warning_color = HexColor('#ff6b6b')
    safe_color = HexColor('#00d4aa')
    
    story = []
    
    # ── Header ──
    story.append(Paragraph("DriverGuard AI", title_style))
    story.append(Paragraph("Ride Safety Report", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=accent_color))
    story.append(Spacer(1, 12))
    
    # ── Ride Info Table ──
    ride_info = ride_data.get('ride', {})
    driver_name = ride_data.get('driver_name', 'Unknown Driver')
    vehicle = ride_data.get('vehicle', 'Unknown Vehicle')
    date_str = ride_data.get('date', datetime.now().strftime('%B %d, %Y'))
    start_time = ride_data.get('start_time', 'Not Available')
    end_time = ride_data.get('end_time', 'Not Available')
    duration = ride_data.get('duration', 'Not Available')
    distance = ride_data.get('distance', 'Not Available')
    avg_speed = ride_data.get('avg_speed', 'Not Available')
    
    info_data = [
        ['Driver', driver_name],
        ['Vehicle', vehicle],
        ['Date', date_str],
        ['Start Time', start_time],
        ['End Time', end_time],
        ['Duration', duration],
        ['Distance', distance],
        ['Average Speed', avg_speed],
    ]
    
    info_table = Table(info_data, colWidths=[50*mm, 110*mm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#666666')),
        ('TEXTCOLOR', (1, 0), (1, -1), HexColor('#1a1a2e')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, HexColor('#e0e0e0')),
    ]))
    
    story.append(info_table)
    story.append(Spacer(1, 20))
    
    # ── Safety Score ──
    # A finalized ride always carries a summary: the route refuses to render a
    # report without one, so a missing value here means a caller reached this
    # service directly. Rendered as an explicit dash rather than "N/A/100",
    # which read as a score of "N/A out of 100" on the face of the document.
    session_summary = ride_data.get('session_summary') or {}
    final_score = session_summary.get('final_score')
    grade = session_summary.get('grade')
    lowest_score = session_summary.get('lowest_session_score')
    total_events = session_summary.get('total_events', 0)
    phone_events = session_summary.get('phone_events', 0)
    total_distracted_duration = session_summary.get('total_distracted_duration', 0)

    def as_score(value) -> str:
        return f'{value}/100' if value is not None else 'Not recorded'

    story.append(Paragraph("Safety Score Summary", heading_style))

    score_data = [
        ['Metric', 'Value'],
        ['Final Safety Score', as_score(final_score)],
        ['Grade', str(grade) if grade is not None else 'Not recorded'],
        ['Lowest Session Score', as_score(lowest_score)],
        ['Total Events', str(total_events)],
        ['Phone Events', str(phone_events)],
        ['Total Distracted Duration', f'{total_distracted_duration}s'],
    ]
    
    score_table = Table(score_data, colWidths=[100*mm, 60*mm])
    score_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 1), (0, -1), HexColor('#666666')),
        ('TEXTCOLOR', (1, 1), (1, -1), HexColor('#1a1a2e')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
    ]))
    
    story.append(score_table)
    story.append(Spacer(1, 20))
    
    # ── Events Detail ──
    events = session_summary.get('events', [])
    if events:
        story.append(Paragraph("Detected Events", heading_style))
        
        event_headers = ['Event Type', 'Start Time', 'End Time', 'Duration', 'Max Confidence', 'Min Score']
        event_rows = [event_headers]
        
        for event in events:
            start_ts = event.get('start_time', 0)
            end_ts = event.get('end_time', 0)
            duration = event.get('duration', 0)
            max_conf = event.get('max_confidence')
            min_score = event.get('min_score', 0)
            
            # Rendered in UTC, because the ride's own start and end times are
            # stored and printed in UTC. datetime.fromtimestamp() without a tz
            # would render these in the server's local zone, so the two time
            # columns in the same document could disagree by the host's offset.
            start_str = (
                datetime.fromtimestamp(start_ts, tz=timezone.utc).strftime('%H:%M:%S')
                if start_ts else 'N/A'
            )
            end_str = (
                datetime.fromtimestamp(end_ts, tz=timezone.utc).strftime('%H:%M:%S')
                if end_ts else 'N/A'
            )
            conf_str = f'{max_conf:.1%}' if max_conf is not None else 'N/A'
            
            event_rows.append([
                event.get('type', 'Unknown'),
                start_str,
                end_str,
                f'{duration:.1f}s',
                conf_str,
                f'{min_score}/100',
            ])
        
        event_table = Table(event_rows, colWidths=[35*mm, 25*mm, 25*mm, 25*mm, 25*mm, 25*mm])
        event_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('BACKGROUND', (0, 0), (-1, 0), primary_color),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 1), (-1, -1), HexColor('#333333')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
        ]))
        
        story.append(event_table)
    else:
        story.append(Paragraph("No distraction events detected during this session.", body_style))
    
    story.append(Spacer(1, 30))
    
    # ── Footer ──
    story.append(HRFlowable(width="100%", thickness=1, color=HexColor('#e0e0e0')))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"Report generated on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC",
        small_style
    ))
    story.append(Paragraph(
        "DriverGuard AI - AI-Powered Driver Safety Monitoring",
        small_style
    ))
    
    # Build PDF
    doc.build(story)
    
    buffer.seek(0)
    return buffer.read()