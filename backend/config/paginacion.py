from rest_framework.pagination import PageNumberPagination


class Paginacion(PageNumberPagination):
    """50 resultados por página. ``?por_pagina=N`` (máx. 200) permite pedir menos o más;
    el inicio usa ``por_pagina=1`` cuando solo necesita el total."""

    page_size = 50
    page_size_query_param = "por_pagina"
    max_page_size = 200
