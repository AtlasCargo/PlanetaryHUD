#!/usr/bin/env python3
"""
Script to properly install Codex from the cloned repository
"""

import os
from scrapybara import Scrapybara

def install_codex_properly(ubuntu):
    """Install Codex properly from the cloned repository"""
    
    try:
        print(f"\n🔧 Installing Codex properly on instance: {ubuntu.id}")
        
        # Navigate to the codex-cli directory
        print("   - Setting up Codex CLI...")
        setup_commands = [
            "cd ~/codex-install/codex-cli",
            "npm install",
            "npm link"
        ]
        
        for cmd in setup_commands:
            try:
                print(f"   - Running: {cmd}")
                result = ubuntu.bash(command=cmd)
                print(f"   - Result: {result}")
            except Exception as e:
                print(f"   - {cmd} failed: {e}")
        
        # Try to make codex globally accessible
        print("   - Making codex globally accessible...")
        global_commands = [
            "cd ~/codex-install/codex-cli",
            "sudo npm install -g .",
            "ln -sf ~/codex-install/codex-cli/bin/codex.js ~/.local/bin/codex",
            "chmod +x ~/.local/bin/codex"
        ]
        
        for cmd in global_commands:
            try:
                print(f"   - Running: {cmd}")
                result = ubuntu.bash(command=cmd)
                print(f"   - Result: {result}")
            except Exception as e:
                print(f"   - {cmd} failed: {e}")
        
        # Add ~/.local/bin to PATH if not already there
        print("   - Setting up PATH...")
        path_commands = [
            "echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc",
            "source ~/.bashrc",
            "export PATH=$PATH:~/.local/bin"
        ]
        
        for cmd in path_commands:
            try:
                print(f"   - Running: {cmd}")
                result = ubuntu.bash(command=cmd)
                print(f"   - Result: {result}")
            except Exception as e:
                print(f"   - {cmd} failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error installing Codex properly: {e}")
        return False

def test_codex_installation(ubuntu):
    """Test if Codex is now working"""
    
    try:
        print(f"\n🧪 Testing Codex installation on instance: {ubuntu.id}")
        
        # Test different ways to run codex
        test_commands = [
            "codex --help",
            "~/.local/bin/codex --help",
            "node ~/codex-install/codex-cli/bin/codex.js --help",
            "cd ~/codex-install/codex-cli && node bin/codex.js --help"
        ]
        
        for cmd in test_commands:
            try:
                print(f"   - Testing: {cmd}")
                result = ubuntu.bash(command=cmd)
                print(f"   - Result: {result}")
                
                # If any command works, we're good
                if "error" not in str(result).lower() and result.output:
                    print(f"   ✅ Codex is working via: {cmd}")
                    return True
                    
            except Exception as e:
                print(f"   - {cmd} failed: {e}")
        
        return False
        
    except Exception as e:
        print(f"❌ Error testing Codex: {e}")
        return False

def main():
    """Main installation process"""
    
    print("🚀 Proper Codex Installation on Scrapybara Ubuntu Instance")
    print("=" * 60)
    
    # Get API key
    api_key = os.getenv('SCRAPYBARA')
    if not api_key:
        print("❌ SCRAPYBARA environment variable not found")
        return
    
    try:
        scrapy = Scrapybara(api_key=api_key)
        instances = scrapy.get_instances()
        ubuntu_instances = [inst for inst in instances if hasattr(inst, 'bash')]
        
        if not ubuntu_instances:
            print("❌ No Ubuntu instances found")
            return
        
        print(f"✅ Found {len(ubuntu_instances)} Ubuntu instances")
        
        # Use the first instance
        ubuntu = ubuntu_instances[0]
        print(f"📋 Using instance: {ubuntu.id}")
        
        # Install Codex properly
        if install_codex_properly(ubuntu):
            print("\n✅ Codex installation completed!")
            
            # Test the installation
            if test_codex_installation(ubuntu):
                print("\n🎉 Codex is now properly installed and working!")
                print(f"   - Instance ID: {ubuntu.id}")
                print("   - You can now use: codex --help")
            else:
                print("\n⚠️  Codex installation completed but testing failed")
        else:
            print("\n❌ Codex installation failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
