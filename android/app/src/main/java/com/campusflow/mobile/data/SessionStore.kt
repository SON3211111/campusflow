package com.campusflow.mobile.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.core.content.edit
import com.google.gson.Gson
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Tokens are encrypted with an Android Keystore key; backups are disabled. */
class SessionStore(context: Context) {
    private val prefs = context.getSharedPreferences("campusflow", Context.MODE_PRIVATE)
    private val gson = Gson()
    var baseUrl: String
        get() = prefs.getString("baseUrl", "http://10.0.2.2:8080/api/")!!
        set(value) { prefs.edit { putString("baseUrl", value) } }
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey("campusflow_session", null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder("campusflow_session", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    fun load(): Session? = runCatching {
        val stored = prefs.getString("session", null) ?: return null
        val parts = stored.split(":")
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)))
        gson.fromJson(String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8), Session::class.java)
    }.getOrElse { clear(); null }
    fun save(session: Session) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val iv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP)
        val data = Base64.encodeToString(cipher.doFinal(gson.toJson(session).toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
        prefs.edit { putString("session", "$iv:$data") }
    }
    fun clear() { prefs.edit { remove("session") } }
}
