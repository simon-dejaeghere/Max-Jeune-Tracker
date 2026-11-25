# Régénère les copies .js des GeoJSON (nécessaires quand la carte est ouverte en file://)
from pathlib import Path
d = Path(__file__).parent
for name, var in [("trainnomade-traces-ferroviaires", "TRACES_GEOJSON"), ("liste-des-gares", "GARES_GEOJSON")]:
    src = (d / f"{name}.geojson").read_text(encoding="utf-8")
    (d / f"{name}.js").write_text(f"window.{var} = " + src + ";\n", encoding="utf-8")
