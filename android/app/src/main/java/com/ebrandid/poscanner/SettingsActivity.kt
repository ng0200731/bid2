package com.ebrandid.poscanner

import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText

class SettingsActivity : AppCompatActivity() {

    private lateinit var etServerIp: TextInputEditText
    private lateinit var etServerPort: TextInputEditText
    private lateinit var btnSave: MaterialButton
    private lateinit var btnBack: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        etServerIp = findViewById(R.id.etServerIp)
        etServerPort = findViewById(R.id.etServerPort)
        btnSave = findViewById(R.id.btnSave)
        btnBack = findViewById(R.id.btnBack)

        loadSettings()

        btnSave.setOnClickListener {
            saveSettings()
        }

        btnBack.setOnClickListener {
            finish()
        }
    }

    private fun loadSettings() {
        val prefs = getSharedPreferences("app_settings", Context.MODE_PRIVATE)
        val serverIp = prefs.getString("server_ip", "192.168.0.144") ?: "192.168.0.144"
        val serverPort = prefs.getString("server_port", "8768") ?: "8768"

        etServerIp.setText(serverIp)
        etServerPort.setText(serverPort)
    }

    private fun saveSettings() {
        val serverIp = etServerIp.text.toString().trim()
        val serverPort = etServerPort.text.toString().trim()

        if (serverIp.isEmpty()) {
            Toast.makeText(this, "Please enter server IP", Toast.LENGTH_SHORT).show()
            return
        }

        if (serverPort.isEmpty()) {
            Toast.makeText(this, "Please enter server port", Toast.LENGTH_SHORT).show()
            return
        }

        val prefs = getSharedPreferences("app_settings", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("server_ip", serverIp)
            .putString("server_port", serverPort)
            .apply()

        Toast.makeText(this, "Settings saved", Toast.LENGTH_SHORT).show()
        finish()
    }
}
