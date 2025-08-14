from rest_framework import serializers
from .models import Task, BusinessData

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'completed', 'created_at', 'updated_at']

class BusinessDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessData
        fields = '__all__'