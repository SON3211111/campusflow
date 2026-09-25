package com.campusflow.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.viewmodel.compose.viewModel
import com.campusflow.mobile.ui.CampusApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val colors = if (isSystemInDarkTheme()) darkColorScheme(primary = Color(0xFFB9C5FF), secondary = Color(0xFFA3DFC9))
            else lightColorScheme(primary = Color(0xFF4165EE), secondary = Color(0xFF238772),
                background = Color(0xFFF5F7FC), surface = Color.White, surfaceVariant = Color(0xFFEBEFF8),
                onSurface = Color(0xFF1D2845), onSurfaceVariant = Color(0xFF64708B))
            MaterialTheme(colorScheme = colors) { CampusApp(viewModel()) }
        }
    }
}
