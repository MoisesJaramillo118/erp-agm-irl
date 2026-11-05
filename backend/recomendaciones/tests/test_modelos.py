from datetime import date

from django.test import TestCase

from config.pruebas import crear_producto
from recomendaciones.models import FactorExplicativo, Pronostico, Recomendacion


class PronosticoTest(TestCase):
    def setUp(self):
        self.producto = crear_producto()

    def _pronostico(self, pronosticado, real, semana=date(2026, 11, 2)):
        return Pronostico.objects.create(producto=self.producto, semana=semana,
                                         demanda_pronosticada=pronosticado, demanda_real=real)

    def test_acierto_es_uno_menos_error_relativo_por_cien(self):
        self.assertAlmostEqual(self._pronostico(90, 100).acierto(), 90.0)
        self.assertAlmostEqual(self._pronostico(120, 100, date(2026, 11, 9)).acierto(), 80.0)
        self.assertAlmostEqual(self._pronostico(100, 100, date(2026, 11, 16)).acierto(), 100.0)

    def test_sin_demanda_real_no_hay_acierto(self):
        self.assertIsNone(self._pronostico(50, None).acierto())
        self.assertIsNone(self._pronostico(50, 0, date(2026, 11, 9)).acierto())

    def test_recomendacion_se_acepta_o_se_rechaza(self):
        """La decisión del gerente queda registrada."""
        r1 = Recomendacion.objects.create(pronostico=self._pronostico(100, None), cantidad_sugerida=300)
        self.assertEqual(r1.estado, Recomendacion.Estado.PENDIENTE)
        r1.aceptar()
        r1.refresh_from_db()
        self.assertEqual(r1.estado, Recomendacion.Estado.ACEPTADA)
        r2 = Recomendacion.objects.create(pronostico=self._pronostico(80, None, date(2026, 11, 9)),
                                          cantidad_sugerida=0)
        r2.rechazar()
        r2.refresh_from_db()
        self.assertEqual(r2.estado, Recomendacion.Estado.RECHAZADA)

    def test_factores_explicativos_cuelgan_del_pronostico(self):
        p = self._pronostico(100, None)
        FactorExplicativo.objects.create(pronostico=p, variable="tendencia", contribucion=12.5,
                                         texto="Las ventas de las últimas cuatro semanas subieron 18 %")
        self.assertEqual(p.factores.count(), 1)
