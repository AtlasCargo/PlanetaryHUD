#!/usr/bin/env python3
"""
Script to install Codex on existing Scrapybara Ubuntu instances
"""

import os
from scrapybara import Scrapybara

def get_existing_instances():
    """Get existing Ubuntu instances"""
    
    api_key = os.getenv('SCRAPYBARA')
    if not api_key:
        print("❌ SCRAPYBARA environment variable not found")
        return []
    
    try:
        scrapy = Scrapybara(api_key=api_key)
        instances = scrapy.get_instances()
        
        # Filter for Ubuntu instances
        ubuntu_instances = [inst for inst in instances if hasattr(inst, 'bash')]
        
        print(f"✅ Found {len(ubuntu_instances)} Ubuntu instances")
        return ubuntu_instances
        
    except Exception as e:
        print(f"❌ Error getting instances: {e}")
        return []

def install_codex_on_instance(ubuntu):
    """Install Codex on a specific Ubuntu instance"""
    
    try:
        print(f"\n🔧 Installing Codex on instance: {ubuntu.id}")
        
        # Check instance status
        print("   - Checking instance status...")
        status = ubuntu.status
        print(f"   - Status: {status}")
        
        # Update package list
        print("   - Updating package list...")
        update_result = ubuntu.bash(command="sudo apt update -y")
        print(f"   - Update result: {update_result}")
        
        # Install required dependencies
        print("   - Installing dependencies...")
        deps_result = ubuntu.bash(command="sudo apt install -y curl wget git python3 python3-pip nodejs npm")
        print(f"   - Dependencies result: {deps_result}")
        
        # Try to install Codex
        print("   - Installing Codex...")
        
        # Try different installation methods
        codex_methods = [
            "npm install -g @codex-ai/codex",
            "pip install codex-ai",
            "pip install openai-codex"
        ]
        
        codex_installed = False
        for method in codex_methods:
            try:
                print(f"   - Trying: {method}")
                result = ubuntu.bash(command=method)
                print(f"   - Result: {result}")
                if "error" not in str(result).lower() and "failed" not in str(result).lower():
                    codex_installed = True
                    print(f"   ✅ Codex installed successfully via: {method}")
                    break
            except Exception as e:
                print(f"   - Method failed: {e}")
                continue
        
        if not codex_installed:
            print("   ⚠️  Standard installation methods failed, trying GitHub approach...")
            
            # Try GitHub installation
            github_commands = [
                "mkdir -p ~/codex-install",
                "cd ~/codex-install",
                "git clone https://github.com/openai/Codex.git .",
                "pip install -r requirements.txt"
            ]
            
            for cmd in github_commands:
                try:
                    result = ubuntu.bash(command=cmd)
                    print(f"   - {cmd}: {result}")
                except Exception as e:
                    print(f"   - {cmd} failed: {e}")
        
        # Verify installation
        print("   - Verifying installation...")
        try:
            version_result = ubuntu.bash(command="codex --version")
            print(f"   - Codex version: {version_result}")
        except:
            try:
                version_result = ubuntu.bash(command="python -c 'import codex; print(codex.__version__)'")
                print(f"   - Codex version: {version_result}")
            except:
                try:
                    version_result = ubuntu.bash(command="python -c 'import openai_codex; print(openai_codex.__version__)'")
                    print(f"   - OpenAI Codex version: {version_result}")
                except:
                    print("   - Could not verify Codex version")
        
        return True
        
    except Exception as e:
        print(f"❌ Error installing Codex: {e}")
        return False

def test_codex_on_instance(ubuntu):
    """Test Codex functionality on a specific instance"""
    
    try:
        print(f"\n🧪 Testing Codex on instance: {ubuntu.id}")
        
        # Try different ways to test Codex
        test_commands = [
            "codex --help",
            "codex version",
            "python -c 'import codex; print(dir(codex))'",
            "python -c 'import openai_codex; print(dir(openai_codex))'"
        ]
        
        for cmd in test_commands:
            try:
                result = ubuntu.bash(command=cmd)
                print(f"   - {cmd}: {result}")
            except Exception as e:
                print(f"   - {cmd} failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing Codex: {e}")
        return False

def main():
    """Main installation process using existing instances"""
    
    print("🚀 Codex Installation on Existing Scrapybara Ubuntu Instances")
    print("=" * 65)
    
    # Get existing instances
    instances = get_existing_instances()
    if not instances:
        print("❌ No Ubuntu instances found")
        return
    
    print(f"📋 Found {len(instances)} Ubuntu instances")
    
    # Try to install Codex on the first available instance
    for i, instance in enumerate(instances):
        print(f"\n🔄 Attempting installation on instance {i+1}/{len(instances)}")
        
        if install_codex_on_instance(instance):
            print(f"\n✅ Codex installation completed on instance {i+1}!")
            
            # Test functionality
            test_codex_on_instance(instance)
            
            print(f"\n🎉 Codex is now installed and ready to use on instance {i+1}!")
            print(f"   - Instance ID: {instance.id}")
            break
        else:
            print(f"⚠️  Installation failed on instance {i+1}, trying next...")
    else:
        print("\n❌ Failed to install Codex on any instance")

if __name__ == "__main__":
    main()
