package com.ebrandid.poscanner

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.ebrandid.poscanner.api.ApiClient
import com.ebrandid.poscanner.models.ScanRequest
import com.ebrandid.poscanner.utils.Constants
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    
    private lateinit var tvPoNumber: TextView
    private lateinit var spinnerDepartment: Spinner
    private lateinit var etNotes: EditText
    private lateinit var btnSave: MaterialButton
    private lateinit var btnScanAgain: MaterialButton
    private lateinit var progressBar: ProgressBar
    
    private var poNumber: String = ""
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        initViews()
        setupDepartmentSpinner()
        
        // Get PO number from intent
        poNumber = intent.getStringExtra(Constants.EXTRA_PO_NUMBER) ?: ""
        tvPoNumber.text = poNumber
        
        if (poNumber.isEmpty()) {
            Toast.makeText(this, getString(R.string.error_invalid_qr), Toast.LENGTH_SHORT).show()
            finish()
            return
        }
        
        setupClickListeners()
    }
    
    private fun initViews() {
        tvPoNumber = findViewById(R.id.tvPoNumber)
        spinnerDepartment = findViewById(R.id.spinnerDepartment)
        etNotes = findViewById(R.id.etNotes)
        btnSave = findViewById(R.id.btnSave)
        btnScanAgain = findViewById(R.id.btnScanAgain)
        progressBar = findViewById(R.id.progressBar)
    }
    
    private fun setupDepartmentSpinner() {
        val adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            Constants.DEPARTMENTS
        )
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerDepartment.adapter = adapter
    }
    
    private fun setupClickListeners() {
        btnSave.setOnClickListener {
            saveScan()
        }
        
        btnScanAgain.setOnClickListener {
            finish()
        }
    }
    
    private fun saveScan() {
        // Validate department selection
        if (spinnerDepartment.selectedItemPosition == -1) {
            Toast.makeText(this, getString(R.string.error_no_department), Toast.LENGTH_SHORT).show()
            return
        }
        
        // Check network connectivity
        if (!isNetworkAvailable()) {
            Toast.makeText(this, getString(R.string.error_network), Toast.LENGTH_LONG).show()
            return
        }
        
        val department = spinnerDepartment.selectedItem.toString()
        val notes = etNotes.text.toString().trim().ifEmpty { null }
        
        val request = ScanRequest(
            poNumber = poNumber,
            department = department,
            notes = notes
        )
        
        // Show loading
        setLoading(true)
        
        // Make API call
        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.recordScan(request)
                
                if (response.isSuccessful && response.body()?.success == true) {
                    runOnUiThread {
                        setLoading(false)
                        Toast.makeText(
                            this@MainActivity,
                            getString(R.string.success_saved),
                            Toast.LENGTH_SHORT
                        ).show()
                        
                        // Clear form
                        clearForm()
                        
                        // Return to scanner after short delay
                        tvPoNumber.postDelayed({
                            finish()
                        }, 1500)
                    }
                } else {
                    runOnUiThread {
                        setLoading(false)
                        val errorMessage = response.body()?.message 
                            ?: getString(R.string.error_server)
                        Toast.makeText(
                            this@MainActivity,
                            errorMessage,
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    setLoading(false)
                    Toast.makeText(
                        this@MainActivity,
                        getString(R.string.error_network),
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }
    
    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnSave.isEnabled = !loading
        btnScanAgain.isEnabled = !loading
        spinnerDepartment.isEnabled = !loading
        etNotes.isEnabled = !loading
    }
    
    private fun clearForm() {
        spinnerDepartment.setSelection(0)
        etNotes.text.clear()
    }
    
    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
    }
}
