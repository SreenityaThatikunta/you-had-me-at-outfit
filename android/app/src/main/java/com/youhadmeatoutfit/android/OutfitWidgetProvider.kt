package com.youhadmeatoutfit.android

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.widget.RemoteViews
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import kotlin.concurrent.thread

private const val FEED_URL = "https://you-had-me-at-outfit.vercel.app/widget-outfits.json"
private const val ACTION_REFRESH = "com.youhadmeatoutfit.android.REFRESH_OUTFIT"
private const val MAX_IMAGE_SIZE = 300
private const val PREFS = "outfit_widget"
private const val PLAN_KEY = "plan"

data class OutfitSnapshot(val title: String, val style: String, val reason: String, val pieces: List<OutfitPiece>)
data class OutfitPiece(val name: String, val image: String)

private val fallbackOutfit = OutfitSnapshot(
    title = "Today's outfit",
    style = "Clean casual",
    reason = "A ready-to-wear combination from your wardrobe.",
    pieces = listOf(
        OutfitPiece("Olive Cropped Polo", "https://you-had-me-at-outfit.vercel.app/wardrobe/olive-polo.webp"),
        OutfitPiece("Faded Blue Jeans", "https://you-had-me-at-outfit.vercel.app/wardrobe/faded-blue-jeans.webp"),
        OutfitPiece("White Samba Sneakers", "https://you-had-me-at-outfit.vercel.app/wardrobe/white-samba-sneakers.webp"),
    ),
)

class OutfitWidgetProvider : AppWidgetProvider() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ACTION_REFRESH) {
            val manager = AppWidgetManager.getInstance(context)
            onUpdate(context, manager, manager.getAppWidgetIds(ComponentName(context, OutfitWidgetProvider::class.java)))
        } else {
            super.onReceive(context, intent)
        }
    }

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val pending = goAsync()
        thread {
            try {
                manager.updateAppWidget(ids, render(context, savedOutfit(context) ?: todayOutfit()))
            } finally {
                scheduleMidnightRefresh(context)
                pending.finish()
            }
        }
    }

    companion object {
        fun savePlan(context: Context, json: String) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            if (prefs.getString(PLAN_KEY, null) == json) return
            prefs.edit().putString(PLAN_KEY, json).apply()
            context.sendBroadcast(Intent(context, OutfitWidgetProvider::class.java).setAction(ACTION_REFRESH))
        }
    }

    override fun onDisabled(context: Context) {
        context.getSystemService(AlarmManager::class.java).cancel(refreshIntent(context))
    }

    // The plan the app saved last time it was opened, so the widget matches the app.
    private fun savedOutfit(context: Context): OutfitSnapshot? = try {
        val plan = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(PLAN_KEY, null)
        val outfits = JSONObject(plan ?: "{}").optJSONArray("outfits")
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)
        outfits?.let { list ->
            (0 until list.length()).map { list.getJSONObject(it) }.firstOrNull { it.optString("date") == today }
        }?.let(::parseOutfit)
    } catch (e: Exception) {
        null
    }

    private fun todayOutfit(): OutfitSnapshot = try {
        val outfits = JSONObject(download(FEED_URL).decodeToString()).getJSONArray("outfits")
        if (outfits.length() == 0) {
            fallbackOutfit
        } else {
            val day = Calendar.getInstance().get(Calendar.DAY_OF_YEAR)
            parseOutfit(outfits.getJSONObject((day - 1) % outfits.length()))
        }
    } catch (e: Exception) {
        fallbackOutfit
    }

    private fun parseOutfit(outfit: JSONObject): OutfitSnapshot {
        val pieces = outfit.getJSONArray("pieces")
        return OutfitSnapshot(
            title = outfit.getString("title"),
            style = outfit.getString("style"),
            reason = outfit.getString("reason"),
            pieces = (0 until pieces.length()).map {
                val piece = pieces.getJSONObject(it)
                OutfitPiece(piece.getString("name"), piece.getString("image"))
            },
        )
    }

    private fun render(context: Context, outfit: OutfitSnapshot): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.outfit_widget)
        views.setTextViewText(R.id.title, outfit.title.uppercase())
        views.setTextViewText(R.id.style, outfit.style)
        views.setTextViewText(R.id.reason, outfit.reason)

        listOf(R.id.piece_1, R.id.piece_2, R.id.piece_3).forEachIndexed { index, viewId ->
            val piece = outfit.pieces.getOrNull(index)
            val image = piece?.let { pieceImage(context, it) }
            if (image != null) views.setImageViewBitmap(viewId, image) else views.setImageViewResource(viewId, R.drawable.ic_hanger)
            views.setContentDescription(viewId, piece?.name)
        }

        val openApp = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        views.setOnClickPendingIntent(R.id.widget_root, openApp)
        return views
    }

    // Garment photos are cached on disk so the widget still shows them when offline.
    private fun pieceImage(context: Context, piece: OutfitPiece): Bitmap? {
        val cached = File(File(context.cacheDir, "wardrobe").apply { mkdirs() }, piece.image.substringAfterLast('/'))
        val bytes = try {
            if (cached.exists()) cached.readBytes() else download(piece.image).also { cached.writeBytes(it) }
        } catch (e: Exception) {
            return null
        }
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
        val scale = MAX_IMAGE_SIZE.toFloat() / maxOf(bitmap.width, bitmap.height)
        if (scale >= 1f) return bitmap
        return Bitmap.createScaledBitmap(bitmap, (bitmap.width * scale).toInt(), (bitmap.height * scale).toInt(), true)
    }

    private fun download(url: String): ByteArray {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 5_000
        connection.readTimeout = 5_000
        try {
            if (connection.responseCode != 200) error("HTTP ${connection.responseCode} for $url")
            return connection.inputStream.use { it.readBytes() }
        } finally {
            connection.disconnect()
        }
    }

    private fun scheduleMidnightRefresh(context: Context) {
        val nextDay = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_YEAR, 1)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 1)
            set(Calendar.SECOND, 0)
        }
        context.getSystemService(AlarmManager::class.java)
            .set(AlarmManager.RTC, nextDay.timeInMillis, refreshIntent(context))
    }

    private fun refreshIntent(context: Context) = PendingIntent.getBroadcast(
        context, 0,
        Intent(context, OutfitWidgetProvider::class.java).setAction(ACTION_REFRESH),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
}
