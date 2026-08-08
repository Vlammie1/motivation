package com.vlammie.fitness.ui.meals

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.content.Context
import android.graphics.Matrix
import android.net.Uri
import android.util.Size
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.adamglin.PhosphorIcons
import com.adamglin.phosphoricons.Fill
import com.adamglin.phosphoricons.fill.Barcode
import com.adamglin.phosphoricons.fill.Camera
import com.adamglin.phosphoricons.fill.Images
import com.adamglin.phosphoricons.fill.X
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import androidx.exifinterface.media.ExifInterface
import com.vlammie.fitness.ui.components.BigActionButton
import com.vlammie.fitness.ui.theme.Accent
import com.vlammie.fitness.ui.theme.Danger
import com.vlammie.fitness.ui.theme.Hairline
import com.vlammie.fitness.ui.theme.Surface2
import com.vlammie.fitness.ui.theme.TextPrimary
import com.vlammie.fitness.ui.theme.TextSecondary
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/** Waarvoor de camera aan gaat. */
enum class CameraMode { BARCODE, PHOTO }

/**
 * De camera als inline blok, bedoeld voor een bottom sheet: het beeld staat in
 * een kaart met de knoppen eronder, zodat de sluiter altijd in beeld staat en
 * de rest van het scherm niet volledig bedekt wordt.
 *
 * In [CameraMode.BARCODE] leest hij streepjescodes en sluit hij zichzelf bij de
 * eerste treffer; in [CameraMode.PHOTO] maak je met de witte sluiterknop één
 * foto — of je kiest er een uit je galerij. Beide komen als JPEG terug.
 */
@Composable
fun CameraSheet(
    mode: CameraMode,
    onBarcode: (String) -> Unit,
    onPhoto: (ByteArray) -> Unit,
    onClose: () -> Unit,
) {
    val context = LocalContext.current
    var granted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }
    var denied by remember { mutableStateOf(false) }

    val request = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { result ->
        granted = result
        denied = !result
    }

    LaunchedEffect(Unit) {
        if (!granted) request.launch(Manifest.permission.CAMERA)
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(bottom = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = if (mode == CameraMode.BARCODE) "Streepjescode scannen" else "Fotografeer je bord",
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
                modifier = Modifier.weight(1f),
            )
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(Surface2)
                    .clickable(onClick = onClose),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    PhosphorIcons.Fill.X,
                    contentDescription = "Sluiten",
                    tint = TextPrimary,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
        Spacer(Modifier.height(14.dp))

        if (granted) {
            CameraPreview(mode = mode, onBarcode = onBarcode, onPhoto = onPhoto)
        } else {
            PermissionNotice(
                denied = denied,
                onRetry = { request.launch(Manifest.permission.CAMERA) },
                onClose = onClose,
            )
        }
    }
}

@Composable
private fun CameraPreview(
    mode: CameraMode,
    onBarcode: (String) -> Unit,
    onPhoto: (ByteArray) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val executor = remember { Executors.newSingleThreadExecutor() }
    val handled = remember { AtomicBoolean(false) }
    val capture = remember { if (mode == CameraMode.PHOTO) ImageCapture.Builder().build() else null }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    // De callbacks veranderen bij elke recompositie; via rememberUpdatedState
    // blijft de analyzer die één keer aan de camera hangt naar de laatste wijzen.
    val currentBarcode by rememberUpdatedState(onBarcode)

    val previewView = remember {
        PreviewView(context).apply {
            // FIT: je ziet precies wat er op de foto komt, in plaats van een
            // uitsnede waar de randen van je bord buiten vallen.
            scaleType = PreviewView.ScaleType.FIT_CENTER
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }
    }

    DisposableEffect(mode) {
        val scanner = if (mode == CameraMode.BARCODE) BarcodeScanning.getClient() else null
        val providerFuture = ProcessCameraProvider.getInstance(context)
        var provider: ProcessCameraProvider? = null
        // Het scherm kan alweer weg zijn voordat de camera klaarstaat; dan niets binden.
        var closed = false

        providerFuture.addListener({
            if (closed) return@addListener
            provider = providerFuture.get()
            val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }

            val analysis = if (scanner != null) {
                ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setResolutionSelector(
                        ResolutionSelector.Builder()
                            .setResolutionStrategy(
                                ResolutionStrategy(Size(1280, 720), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER)
                            )
                            .build()
                    )
                    .build()
                    .apply {
                        setAnalyzer(executor) { image ->
                            scanImage(scanner, image) { code ->
                                if (handled.compareAndSet(false, true)) currentBarcode(code)
                            }
                        }
                    }
            } else {
                null
            }

            try {
                provider?.unbindAll()
                val useCases = listOfNotNull(preview, analysis, capture).toTypedArray()
                provider?.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, *useCases)
            } catch (failure: Exception) {
                error = "De camera kon niet starten: ${failure.message}"
            }
        }, ContextCompat.getMainExecutor(context))

        onDispose {
            closed = true
            provider?.unbindAll()
            scanner?.close()
            executor.shutdown()
        }
    }

    // Een foto uit de galerij loopt langs dezelfde weg als een verse opname.
    val pick = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val jpeg = context.readUprightJpeg(uri)
        if (jpeg != null) onPhoto(jpeg) else error = "Die afbeelding kon niet gelezen worden."
    }

    // Vaste hoogte in plaats van een verhouding: dan blijven de knoppen eronder
    // ook op een korte telefoon in beeld.
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(if (mode == CameraMode.BARCODE) 260.dp else 380.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(Color.Black),
    ) {
        AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())

        if (mode == CameraMode.BARCODE) {
            ScanFrame()
        }
    }

    Spacer(Modifier.height(14.dp))
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Icon(
            imageVector = if (mode == CameraMode.BARCODE) PhosphorIcons.Fill.Barcode else PhosphorIcons.Fill.Camera,
            contentDescription = null,
            tint = if (error != null) Danger else Accent,
            modifier = Modifier.size(18.dp),
        )
        Text(
            text = error
                ?: when {
                    mode == CameraMode.BARCODE -> "Houd de streepjescode in het kader"
                    busy -> "Even geduld…"
                    else -> "Van bovenaf, alles op het bord in beeld"
                },
            style = MaterialTheme.typography.bodyLarge,
            color = if (error != null) Danger else TextSecondary,
            textAlign = TextAlign.Center,
        )
    }

    if (mode == CameraMode.PHOTO) {
        Spacer(Modifier.height(16.dp))
        // De knoppenrij van een echte camera-app: galerij links, sluiter in het
        // midden. Rechts een lege plek van dezelfde maat, zodat de witte knop
        // precies in het midden staat.
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            GalleryButton(enabled = !busy) {
                pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
            }
            ShutterButton(enabled = !busy) {
                val target = capture ?: return@ShutterButton
                busy = true
                target.takePicture(
                    ContextCompat.getMainExecutor(context),
                    object : ImageCapture.OnImageCapturedCallback() {
                        override fun onCaptureSuccess(image: ImageProxy) {
                            val jpeg = image.toUprightJpeg()
                            image.close()
                            busy = false
                            if (jpeg != null) onPhoto(jpeg) else error = "De foto kon niet gelezen worden."
                        }

                        override fun onError(exception: ImageCaptureException) {
                            busy = false
                            error = "Foto mislukt: ${exception.message}"
                        }
                    },
                )
            }
            Spacer(Modifier.size(52.dp))
        }
    }
}

/** De witte sluiter: een ring met een gevulde stip erin, zoals je gewend bent. */
@Composable
private fun ShutterButton(enabled: Boolean, onClick: () -> Unit) {
    val tint = if (enabled) Color.White else Color(0x66FFFFFF)
    Box(
        modifier = Modifier
            .size(72.dp)
            .clip(CircleShape)
            .border(3.dp, tint, CircleShape)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Box(modifier = Modifier.size(56.dp).clip(CircleShape).background(tint))
    }
}

/** Ernaast: een foto die je al hebt erbij pakken. */
@Composable
private fun GalleryButton(enabled: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(52.dp)
            .clip(CircleShape)
            .background(Surface2)
            .border(1.dp, Hairline, CircleShape)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = PhosphorIcons.Fill.Images,
            contentDescription = "Foto uit galerij",
            tint = if (enabled) TextPrimary else TextSecondary,
            modifier = Modifier.size(22.dp),
        )
    }
}

@Composable
private fun ScanFrame() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Box(
            modifier = Modifier
                .fillMaxWidth(0.78f)
                .height(140.dp)
                .clip(RoundedCornerShape(20.dp))
                .border(2.dp, Accent, RoundedCornerShape(20.dp)),
        )
    }
}

@Composable
private fun PermissionNotice(denied: Boolean, onRetry: () -> Unit, onClose: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 28.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(PhosphorIcons.Fill.Camera, contentDescription = null, tint = Accent, modifier = Modifier.size(40.dp))
        Spacer(Modifier.height(16.dp))
        Text(
            text = if (denied) {
                "Zonder toegang tot de camera kan de app geen streepjescodes lezen " +
                    "en geen foto's van je eten maken. Zet het aan bij de app-instellingen " +
                    "van je telefoon of probeer het hier opnieuw."
            } else {
                "Toestemming voor de camera wordt gevraagd…"
            },
            style = MaterialTheme.typography.bodyLarge,
            color = TextSecondary,
            textAlign = TextAlign.Center,
        )
        if (denied) {
            Spacer(Modifier.height(20.dp))
            BigActionButton(text = "Opnieuw vragen", onClick = onRetry)
            Spacer(Modifier.height(10.dp))
            Text(
                text = "Terug",
                style = MaterialTheme.typography.labelLarge,
                color = TextSecondary,
                modifier = Modifier.clickable(onClick = onClose).padding(8.dp),
            )
        }
    }
}

// ---------------------------------------------------------------------
// Beeldbewerking
// ---------------------------------------------------------------------

@OptIn(ExperimentalGetImage::class)
private fun scanImage(
    scanner: com.google.mlkit.vision.barcode.BarcodeScanner,
    proxy: ImageProxy,
    onFound: (String) -> Unit,
) {
    val media = proxy.image
    if (media == null) {
        proxy.close()
        return
    }
    val input = InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees)
    scanner.process(input)
        .addOnSuccessListener { codes ->
            codes.firstNotNullOfOrNull { barcode -> barcode.usableValue() }?.let(onFound)
        }
        .addOnCompleteListener { proxy.close() }
}

/** Alleen echte productcodes; QR-codes op een verpakking leveren niks op. */
private fun Barcode.usableValue(): String? {
    val allowed = setOf(
        Barcode.FORMAT_EAN_13,
        Barcode.FORMAT_EAN_8,
        Barcode.FORMAT_UPC_A,
        Barcode.FORMAT_UPC_E,
        Barcode.FORMAT_ITF,
    )
    if (format !in allowed) return null
    return rawValue?.trim()?.takeIf { it.length >= 8 && it.all(Char::isDigit) }
}

/**
 * De vastgelegde foto rechtop zetten en verkleinen. Een foto van 12 megapixel
 * hoeft niet over het net; 1024 pixels is meer dan genoeg om eten te herkennen.
 */
private fun ImageProxy.toUprightJpeg(): ByteArray? {
    val buffer = planes.firstOrNull()?.buffer ?: return null
    val bytes = ByteArray(buffer.remaining()).also { buffer.get(it) }
    val source = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
    return source.toJpeg(imageInfo.rotationDegrees)
}

/**
 * Hetzelfde, maar voor een foto die je uit je galerij kiest. Daar zit de draai
 * in de EXIF-gegevens in plaats van in de camera.
 */
private fun Context.readUprightJpeg(uri: Uri): ByteArray? = runCatching {
    val source = contentResolver.openInputStream(uri).use { BitmapFactory.decodeStream(it) } ?: return null
    val orientation = contentResolver.openInputStream(uri).use { stream ->
        stream?.let {
            ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
        }
    }
    val rotation = when (orientation) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90
        ExifInterface.ORIENTATION_ROTATE_180 -> 180
        ExifInterface.ORIENTATION_ROTATE_270 -> 270
        else -> 0
    }
    source.toJpeg(rotation)
}.getOrNull()

private fun Bitmap.toJpeg(rotationDegrees: Int, maxSize: Int = 1024, quality: Int = 82): ByteArray? {
    val scale = maxSize.toFloat() / maxOf(width, height)
    val matrix = Matrix().apply {
        if (scale < 1f) postScale(scale, scale)
        if (rotationDegrees != 0) postRotate(rotationDegrees.toFloat())
    }
    val result = if (matrix.isIdentity) this else Bitmap.createBitmap(this, 0, 0, width, height, matrix, true)

    return ByteArrayOutputStream().use { stream ->
        result.compress(Bitmap.CompressFormat.JPEG, quality, stream)
        stream.toByteArray()
    }
}
