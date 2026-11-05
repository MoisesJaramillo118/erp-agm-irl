from django.db import models
from django.utils import timezone


class Pronostico(models.Model):
    producto = models.ForeignKey(
        "inventario.Producto", on_delete=models.PROTECT, related_name="pronosticos"
    )
    # Lunes de la semana pronosticada.
    semana = models.DateField()
    demanda_pronosticada = models.FloatField("demanda pronosticada (und.)")
    # Se completa cuando la semana ya transcurrió (o, en la evaluación, con las 4 últimas semanas reservadas).
    demanda_real = models.FloatField("demanda real (und.)", null=True, blank=True)

    class Meta:
        verbose_name = "pronóstico"
        verbose_name_plural = "pronósticos"
        ordering = ["-semana", "producto__descripcion"]
        constraints = [
            models.UniqueConstraint(fields=["producto", "semana"], name="un_pronostico_por_producto_y_semana")
        ]

    def __str__(self):
        return f"{self.producto.codigo} · semana del {self.semana:%d/%m/%Y}"

    def acierto(self):
        """acierto = (1 − |real − pronosticado| / real) × 100.
        None si todavía no hay demanda real o si ésta es cero (la fórmula no se puede calcular)."""
        if not self.demanda_real:
            return None
        return (1 - abs(self.demanda_real - self.demanda_pronosticada) / self.demanda_real) * 100


class FactorExplicativo(models.Model):
    pronostico = models.ForeignKey(Pronostico, on_delete=models.CASCADE, related_name="factores")
    variable = models.CharField(max_length=60)
    # Contribución SHAP de la variable al pronóstico (en unidades; positiva sube, negativa baja).
    contribucion = models.FloatField()
    # Frase sencilla en español. Solo se completa para los 3 factores con mayor valor absoluto.
    texto = models.CharField(max_length=250, blank=True)

    class Meta:
        verbose_name = "factor explicativo"
        verbose_name_plural = "factores explicativos"

    def __str__(self):
        return f"{self.variable}: {self.contribucion:+.2f}"


class Recomendacion(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        ACEPTADA = "aceptada", "Aceptada"
        RECHAZADA = "rechazada", "Rechazada"

    pronostico = models.OneToOneField(Pronostico, on_delete=models.CASCADE, related_name="recomendacion")
    cantidad_sugerida = models.PositiveIntegerField()
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.PENDIENTE)
    fecha = models.DateField(default=timezone.localdate)

    class Meta:
        verbose_name = "recomendación"
        verbose_name_plural = "recomendaciones"
        ordering = ["-fecha", "-id"]

    def __str__(self):
        return f"Reponer {self.cantidad_sugerida} de {self.pronostico.producto.codigo} ({self.get_estado_display()})"

    def aceptar(self):
        """El gerente acepta la sugerencia; la decisión queda registrada."""
        self.estado = self.Estado.ACEPTADA
        self.save(update_fields=["estado"])

    def rechazar(self):
        """El gerente descarta la sugerencia; la decisión queda registrada."""
        self.estado = self.Estado.RECHAZADA
        self.save(update_fields=["estado"])
