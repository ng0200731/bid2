# Add project specific ProGuard rules here.
-keep class com.ebrandid.poscanner.models.** { *; }
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn okhttp3.**
-dontwarn retrofit2.**
