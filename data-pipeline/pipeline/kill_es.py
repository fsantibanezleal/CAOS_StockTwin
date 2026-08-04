"""The Spanish half of every kill criterion, keyed by scenario id.

WHY IT LIVES IN ITS OWN FILE. The criteria are the part of a scenario that turns it from a
demonstration into a test, and they are the longest prose the manifest carries. Keeping the
translation beside the English in scenarios.py made the table unreadable; keeping it here means the
scenario definition reads as a specification and the translation reads as a translation.
"""

KILL_ES: dict[str, str] = {
    "single": (
        "Ningún par de celdas puede quedar más empinado que el ángulo de reposo impuesto al final de "
        "la construcción, y la masa debe conservarse hasta 1e-6 del volumen colocado. El predecesor "
        "terminó con 446 pares sobre el ángulo, el peor a 55,9 grados contra un impuesto de 37, que "
        "es lo que hacía que la pila se viera con púas."
    ),
    "short_dwell": (
        "El rango medido del flujo debe ser sustancialmente MÁS CORTO que el caso de referencia "
        "construido con la misma semilla y geometría. Si la permanencia no mueve el rango, el modelo "
        "de flujo no es causal y el producto afirma algo que no hace."
    ),
    "long_dwell": (
        "El rango medido del flujo debe ser MÁS LARGO que la referencia construida con la misma "
        "semilla y geometría. Si una permanencia más larga no perjudica, el modelo de flujo no está "
        "cargando la secuencia de extracción."
    ),
    "trending": (
        "La reducción de varianza debe resultar MEJOR que la referencia mientras el flujo recuperado "
        "sigue derivando visiblemente. Un número que mejora mientras el problema empeora es el punto; "
        "si el número no mejora, la tendencia no está llegando a la entrada."
    ),
    "erratic_feed": (
        "La varianza de salida debe ser MÁS ALTA que la referencia en términos absolutos mientras la "
        "razón mejora. Si ambas se mueven en el mismo sentido, la métrica no es una razón de lo que "
        "declara ser."
    ),
    "yard": (
        "Cada carga debe aterrizar en el área a la que su clase la rutea, los consolidados por área "
        "deben diferir en más que sus propios intervalos del 95 por ciento, y los invariantes de "
        "reposo y masa del caso simple deben seguir cumpliéndose en las tres áreas."
    ),
    "yard_five": (
        "La dispersión de ley dentro de cada área debe ser MÁS ESTRECHA que en el patio de tres "
        "áreas. Si no lo es, el ruteador no está separando y las áreas extra cuestan sin devolver "
        "nada."
    ),
    "misrouted": (
        "La dispersión de ley dentro de cada área debe ser MÁS AMPLIA que en el patio limpio de tres "
        "áreas, y la separación entre las medias por área menor. Si clasificar mal no cuesta nada, el "
        "ruteador no está ruteando según la estimación."
    ),
    "sidehill": (
        "Ninguna celda puede terminar bajo su cota de terreno ORIGINAL, porque eso es una excavación "
        "que nadie realizó. El invariante de reposo debe cumplirse sobre el material colocado sin "
        "tocar el terreno natural más empinado que el reposo, y el volumen de material debe medirse "
        "contra la superficie original y no contra cero."
    ),
    "valley": (
        "La pila debe quedar MÁS ALTA que el caso de plataforma plana construido con el mismo "
        "presupuesto de cargas, porque eso es lo que significa el confinamiento. Si no lo hace, el "
        "terreno no está restringiendo el material y la topografía es decoración."
    ),
    "cross_valley": (
        "El terreno transitable antes de colocar una sola carga debe diferir de forma medible tanto "
        "de la plataforma plana como del valle. Si los tres reportan la misma fracción, el relieve no "
        "está entrando en el cálculo y el tipo de relleno es una etiqueta."
    ),
    "rough_ground": (
        "El terreno transitable debe estar bajo el 100 por ciento de la plataforma plana mientras el "
        "relieve se mantiene pequeño. Una superficie rugosa y totalmente construible significa que la "
        "rugosidad no está llegando a la pendiente."
    ),
    "intensive_feed": (
        "El volumen colocado debe acercarse al volumen del tronco de cono diseñado y luego DETENERSE, "
        "con el excedente reportado como rechazado. Una pila que sigue creciendo más allá de su "
        "capacidad geométrica no está parada en el ángulo de reposo."
    ),
    "intensive_drain": (
        "El tonelaje entregado debe ser varias veces el de la campaña de referencia, y ningún corte "
        "puede reportar tonelaje negativo o NaN mientras la pila se vacía. Una campaña que drena una "
        "pila ya agotada no está siguiendo el material."
    ),
    "light_drain": (
        "El número de capas independientes que cruza un corte debe ser MÁS ALTO que en la campaña "
        "intensiva, y la reducción de varianza correspondientemente mejor por corte. Si el tamaño del "
        "corte no cambia lo que cruza un corte, la cara no está comprometiendo las capas."
    ),
    "two_phase": (
        "Las dos áreas deben diferir de forma medible en ley media, porque cada una recibió un tramo "
        "distinto de la secuencia de extracción. Dos áreas que salen iguales significan que la "
        "secuencia no está llegando a las pilas."
    ),
    "concurrent": (
        "La reducción de varianza debe ser PEOR que en la campaña secuencial con la misma semilla y "
        "geometría. Un corte tomado a mitad de la construcción tiene menos capas disponibles que "
        "cruzar, y una pila que mezcla igual de bien tanto si se la deja llenarse como si no, no está "
        "mezclando por residencia en absoluto."
    ),
    "surge": (
        "La reducción de varianza debe ser peor que en el caso concurrente más lento, y el número "
        "medio de fuentes independientes por corte menor. Si extraer más rápido no reduce lo que "
        "cruza un corte, la residencia no es de lo que está hecha la mezcla."
    ),
    "short_bench": (
        "La dispersión de la fracción gruesa debe ser MÁS ESTRECHA que la referencia. Un banco de "
        "nueve metros cascadea unos catorce metros, en el extremo bajo de la envolvente medida; si la "
        "segregación no cambia, no está siendo impulsada por la cara en absoluto."
    ),
    "narrow_ramp": (
        "La tasa de rechazo no puede ser mejor que la de referencia. Una vía de entrada más angosta "
        "no puede facilitar el acceso, y si lo hace, el corredor no es lo que controla el acceso."
    ),
    "seldom_dozed": (
        "La tasa de rechazo debe subir respecto de la referencia. Menos trabajo de hoja que colocara "
        "MÁS cargas significaría que la cadencia no está conectada al acceso en absoluto."
    ),
    "wet_material": (
        "La altura máxima debe SUBIR respecto de la referencia sobre la misma huella y el mismo "
        "presupuesto de cargas, porque un reposo más empinado retiene más en la misma área de planta. "
        "Si no lo hace, el ángulo de reposo no está llegando a la geometría."
    ),
}
