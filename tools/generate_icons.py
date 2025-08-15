#!/usr/bin/env python3
"""
Script pour générer toutes les icônes PWA à partir du logo SVG
"""

import os
import subprocess

# Définir les tailles d'icônes nécessaires
icon_sizes = [
    # PWA standard
    (192, 192, "icon-192.png"),
    (512, 512, "icon-512.png"),
    
    # Apple Touch Icons
    (180, 180, "apple-touch-icon.png"),
    (152, 152, "icon-152.png"),
    (167, 167, "icon-167.png"),  # iPad Pro
    
    # Favicon
    (32, 32, "favicon-32.png"),
    (16, 16, "favicon-16.png"),
    
    # Autres tailles Apple
    (120, 120, "icon-120.png"),  # iPhone retina
    (144, 144, "icon-144.png"),  # iPad retina
]

# Créer le dossier icons s'il n'existe pas
if not os.path.exists("icons"):
    os.makedirs("icons")

# Créer une version sans texte pour les petites icônes
logo_no_text = """<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4a6fa5;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#5c8ed8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3a5582;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="lightBlueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8da7cd;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6b8bb9;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15"/>
    </filter>
  </defs>

  <circle cx="256" cy="256" r="240" fill="#f7f9fc" stroke="url(#blueGradient)" stroke-width="4"/>
  
  <g transform="translate(256, 280) scale(1.3)" filter="url(#shadow)">
    <rect x="-4" y="-120" width="8" height="180" fill="url(#lightBlueGradient)"/>
    <rect x="-120" y="-100" width="240" height="8" fill="url(#lightBlueGradient)"/>
    <path d="M -120,-96 L -140,-60 L -100,-60 Z" fill="none" stroke="url(#lightBlueGradient)" stroke-width="3"/>
    <ellipse cx="-120" cy="-60" rx="25" ry="8" fill="url(#lightBlueGradient)"/>
    <path d="M 120,-96 L 100,-60 L 140,-60 Z" fill="none" stroke="url(#lightBlueGradient)" stroke-width="3"/>
    <ellipse cx="120" cy="-60" rx="25" ry="8" fill="url(#lightBlueGradient)"/>
    <rect x="-60" y="55" width="120" height="10" rx="5" fill="url(#lightBlueGradient)"/>
    <rect x="-40" y="65" width="80" height="8" rx="4" fill="url(#lightBlueGradient)"/>
  </g>
  
  <g transform="translate(256, 280) scale(1.3)">
    <rect x="-6" y="-90" width="12" height="150" fill="url(#blueGradient)" rx="6"/>
    <path d="M -6,-70 Q -30,-50 -6,-30 Q 20,-10 -6,10 Q -30,30 -6,50" 
          fill="none" stroke="url(#blueGradient)" stroke-width="8" stroke-linecap="round"/>
    <path d="M 6,-70 Q 30,-50 6,-30 Q -20,-10 6,10 Q 30,30 6,50" 
          fill="none" stroke="url(#blueGradient)" stroke-width="8" stroke-linecap="round"/>
    <path d="M -10,-85 Q -45,-95 -60,-85 Q -55,-70 -35,-65 Q -40,-55 -30,-50 Q -15,-55 -10,-70 Z" 
          fill="url(#blueGradient)" opacity="0.9"/>
    <path d="M 10,-85 Q 45,-95 60,-85 Q 55,-70 35,-65 Q 40,-55 30,-50 Q 15,-55 10,-70 Z" 
          fill="url(#blueGradient)" opacity="0.9"/>
    <ellipse cx="-18" cy="-75" rx="8" ry="10" fill="url(#blueGradient)"/>
    <ellipse cx="18" cy="-75" rx="8" ry="10" fill="url(#blueGradient)"/>
    <circle cx="-20" cy="-77" r="2" fill="#ffffff"/>
    <circle cx="20" cy="-77" r="2" fill="#ffffff"/>
  </g>
</svg>"""

# Sauvegarder la version sans texte
with open("logo_no_text.svg", "w") as f:
    f.write(logo_no_text)

print("🎨 Génération des icônes CrimiTrack PWA...")

# Convertir le SVG en PNG pour chaque taille
for width, height, filename in icon_sizes:
    output_path = f"icons/{filename}"
    
    # Utiliser le logo sans texte pour les petites icônes
    source_logo = "logo_no_text.svg" if width < 180 else "logo.svg"
    
    # Essayer d'utiliser rsvg-convert (plus précis)
    try:
        subprocess.run([
            "rsvg-convert",
            "-w", str(width),
            "-h", str(height),
            source_logo,
            "-o", output_path
        ], check=True, capture_output=True)
        print(f"✅ Créé: {output_path} ({width}x{height})")
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Fallback: utiliser ImageMagick convert
        try:
            subprocess.run([
                "convert",
                "-background", "none",
                "-resize", f"{width}x{height}",
                source_logo,
                output_path
            ], check=True, capture_output=True)
            print(f"✅ Créé: {output_path} ({width}x{height})")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print(f"⚠️  Impossible de créer {output_path} - Installez rsvg-convert ou ImageMagick")

# Créer aussi un favicon.ico
try:
    subprocess.run([
        "convert",
        "icons/favicon-16.png",
        "icons/favicon-32.png",
        "favicon.ico"
    ], check=True, capture_output=True)
    print("✅ Créé: favicon.ico")
except:
    print("⚠️  Impossible de créer favicon.ico")

print("\n🎉 Génération des icônes terminée!")
print("📱 Les icônes sont prêtes pour iOS, iPadOS et PWA")