#!/usr/bin/env python3
"""
Générateur de favicons pour CrimiTrack
Convertit crimitrack.jpg en plusieurs tailles de favicon
"""

from PIL import Image
import os
import sys

def generate_favicons(input_path, output_dir):
    """Génère les favicons à partir de l'image source"""
    
    # Créer le dossier icons s'il n'existe pas
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Ouvrir l'image source
    try:
        img = Image.open(input_path)
        # Convertir en RGBA si nécessaire
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
    except Exception as e:
        print(f"❌ Erreur lors de l'ouverture de l'image : {e}")
        return False
    
    # Tailles de favicon à générer
    sizes = [
        (16, 16, 'favicon-16.png'),
        (32, 32, 'favicon-32.png'),
        (48, 48, 'favicon-48.png'),
        (64, 64, 'favicon-64.png'),
        (96, 96, 'favicon-96.png'),
        (128, 128, 'favicon-128.png'),
        (180, 180, 'apple-touch-icon.png'),
        (192, 192, 'favicon-192.png'),
        (256, 256, 'favicon-256.png'),
        (512, 512, 'favicon-512.png'),
    ]
    
    print("🎨 Génération des favicons...")
    
    for width, height, filename in sizes:
        # Redimensionner l'image
        resized = img.resize((width, height), Image.Resampling.LANCZOS)
        
        # Sauvegarder
        output_path = os.path.join(output_dir, filename)
        resized.save(output_path, 'PNG', optimize=True)
        print(f"✅ {filename} ({width}x{height})")
    
    # Créer aussi un ICO multi-résolution
    icon_sizes = [(16, 16), (32, 32), (48, 48)]
    img.save(
        os.path.join(output_dir, 'favicon.ico'),
        format='ICO',
        sizes=icon_sizes
    )
    print(f"✅ favicon.ico (multi-résolution)")
    
    print("\n✨ Tous les favicons ont été générés avec succès !")
    
    # Afficher le code HTML à ajouter
    print("\n📝 Ajoutez ce code dans le <head> de votre index.html :\n")
    print("""<!-- Favicons CrimiTrack -->
<link rel="icon" type="image/x-icon" href="icons/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="icons/favicon-16.png">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="icons/favicon-48.png">
<link rel="icon" type="image/png" sizes="64x64" href="icons/favicon-64.png">
<link rel="icon" type="image/png" sizes="96x96" href="icons/favicon-96.png">
<link rel="icon" type="image/png" sizes="128x128" href="icons/favicon-128.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/favicon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png">
<meta name="theme-color" content="#2c3e50">""")
    
    return True

if __name__ == "__main__":
    # Chemins
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    
    input_image = os.path.join(project_dir, 'crimitrack.jpg')
    output_directory = os.path.join(project_dir, 'icons')
    
    # Vérifier que l'image existe
    if not os.path.exists(input_image):
        print(f"❌ Image non trouvée : {input_image}")
        print("Assurez-vous que crimitrack.jpg est dans le dossier CrimiTrack_PWA")
        sys.exit(1)
    
    # Vérifier que Pillow est installé
    try:
        from PIL import Image
    except ImportError:
        print("❌ Pillow n'est pas installé.")
        print("Installez-le avec : pip3 install Pillow")
        sys.exit(1)
    
    # Générer les favicons
    success = generate_favicons(input_image, output_directory)
    
    if success:
        print(f"\n📁 Favicons sauvegardés dans : {output_directory}")
    else:
        print("\n❌ Erreur lors de la génération des favicons")
        sys.exit(1)