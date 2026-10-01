# Proguard rules for MedChecklist

# Room Database
-keepclassmembers class * extends androidx.room.RoomDatabase {
    <init>();
}
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keep class com.medchecklist.app.data.** { *; }
-keepclassmembers class com.medchecklist.app.data.** { *; }
