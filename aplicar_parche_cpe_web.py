"""
aplicar_parche_cpe_web.py
Registra la pantalla "Descarga de comprobantes" en tu app web:
  - src/App.jsx                    (importa la pantalla, la registra y le pone titulo)
  - src/screens/InicioScreen.jsx   (boton "Descarga CPE" con la etiqueta "Solo en PC")
  - src/components/SidebarNav.jsx  (entrada en el menu lateral)

Seguro: si algun punto de anclaje no se encuentra EXACTAMENTE una vez, no toca NINGUN archivo.
No crea archivos de respaldo (git es tu respaldo). Se puede ejecutar varias veces.
Solo usa ASCII (sin tildes) en este archivo.
"""
import os
import sys

RAIZ = os.getcwd()

# (archivo, [(texto_a_buscar, texto_nuevo, marca_de_ya_aplicado), ...])
CAMBIOS = {
    "src/App.jsx": [
        (
            "import SireScreen from './screens/SireScreen.jsx'\n",
            "import SireScreen from './screens/SireScreen.jsx'\n"
            "import DescargaCpeScreen from './screens/DescargaCpeScreen.jsx'\n",
            "import DescargaCpeScreen",
        ),
        (
            "  sire: SireScreen, settings: SettingsScreen,",
            "  sire: SireScreen, 'descarga-cpe': DescargaCpeScreen, settings: SettingsScreen,",
            "'descarga-cpe': DescargaCpeScreen",
        ),
        (
            "'sire', 'buzon-ejecutar', 'ajustes-workspace'])",
            "'sire', 'descarga-cpe', 'buzon-ejecutar', 'ajustes-workspace'])",
            "'descarga-cpe', 'buzon-ejecutar'",
        ),
        (
            "'ajustes-workspace': 'Ajustes de tu cuenta',",
            "'ajustes-workspace': 'Ajustes de tu cuenta',\n"
            "  'descarga-cpe': 'Descarga de comprobantes',",
            "'descarga-cpe': 'Descarga de comprobantes'",
        ),
    ],
    "src/screens/InicioScreen.jsx": [
        (
            "  { id: 'sire', label: 'SIRE', icon: '⬇' },\n",
            "  { id: 'sire', label: 'SIRE', icon: '⬇' },\n"
            "  { id: 'descarga-cpe', label: 'Descarga CPE', icon: '\U0001F9FE', soloPc: true },\n",
            "id: 'descarga-cpe'",
        ),
        (
            '<div className="text-[10px] font-semibold text-ink leading-tight">{a.label}</div>\n',
            '<div className="text-[10px] font-semibold text-ink leading-tight">{a.label}</div>\n'
            '              {a.soloPc && <div className="text-[8.5px] font-bold text-azul-inst mt-0.5">Solo en PC</div>}\n',
            "a.soloPc",
        ),
    ],
    "src/components/SidebarNav.jsx": [
        (
            "  { id: 'sire', label: 'SIRE' },\n",
            "  { id: 'sire', label: 'SIRE' },\n"
            "  { id: 'descarga-cpe', label: 'Descarga CPE' },\n",
            "id: 'descarga-cpe'",
        ),
    ],
}


def fallar(msg):
    print("\n[ERROR] " + msg)
    print("No se modifico NINGUN archivo. Copia este mensaje completo y mandamelo.")
    sys.exit(1)


def main():
    if not os.path.isfile(os.path.join(RAIZ, "src", "App.jsx")):
        fallar("No encuentro src/App.jsx. Abre la terminal DENTRO de la carpeta del proyecto (la que contiene 'src' y 'package.json').")
    if not os.path.isfile(os.path.join(RAIZ, "src", "screens", "DescargaCpeScreen.jsx")):
        fallar("Falta src/screens/DescargaCpeScreen.jsx. Copia primero los archivos nuevos a sus carpetas.")

    resultados = {}
    for ruta, lista in CAMBIOS.items():
        completa = os.path.join(RAIZ, ruta)
        if not os.path.isfile(completa):
            fallar("No encuentro " + ruta)
        with open(completa, "rb") as f:
            crudo = f.read().decode("utf-8")
        usa_crlf = "\r\n" in crudo
        texto = crudo.replace("\r\n", "\n")
        cambiado = False
        for buscar, nuevo, marca in lista:
            if marca in texto:
                continue  # ya estaba aplicado
            veces = texto.count(buscar)
            if veces != 1:
                fallar("En %s esperaba encontrar exactamente 1 vez este texto, pero lo encontre %d veces:\n    %s"
                       % (ruta, veces, buscar.strip()[:90]))
            texto = texto.replace(buscar, nuevo, 1)
            cambiado = True
        resultados[ruta] = (texto.replace("\n", "\r\n") if usa_crlf else texto, cambiado)

    for ruta, (texto, cambiado) in resultados.items():
        if not cambiado:
            print("  sin cambios (ya aplicado): " + ruta)
            continue
        completa = os.path.join(RAIZ, ruta)
        with open(completa, "wb") as f:
            f.write(texto.encode("utf-8"))
        print("  actualizado: " + ruta)

    print("\nOK. Ahora ejecuta:  npm run build")


main()
