const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function getFileProperties(filePath) {
    return new Promise((resolve, reject) => {
        const script = `
            $file = Get-Item '${filePath.replace(/\\/g, '\\\\')}';
            $shell = New-Object -ComObject Shell.Application;
            $shellFolder = $shell.Namespace($file.DirectoryName);
            $shellFile = $shellFolder.ParseName($file.Name);
            
            $properties = @{
                'filename' = $file.Name;
                'authors' = '';
                'title' = '';
                'subject' = '';
                'tags' = @();
                'kind' = '';
            };
            
            for ($i = 0; $i -lt 512; $i++) {
                $propName = $shellFolder.GetDetailsOf($null, $i);
                if ($propName) {
                    $propValue = $shellFolder.GetDetailsOf($shellFile, $i);
                    switch ($propName) {
                        'Authors' { $properties.authors = $propValue }
                        'Title' { $properties.title = $propValue }
                        'Subject' { $properties.subject = $propValue }
                        'Tags' { $properties.tags = @($propValue -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ }) }
                        'Kind' { $properties.kind = $propValue }
                    }
                }
            }
            
            ConvertTo-Json -InputObject $properties -Depth 10;
        `;

        const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);

        let output = '';
        let error = '';

        ps.stdout.on('data', (data) => {
            output += data.toString();
        });

        ps.stderr.on('data', (data) => {
            error += data.toString();
        });

        ps.on('exit', (code) => {
            if (code === 0 && output) {
                try {
                    const properties = JSON.parse(output);
                    properties.tags = Array.isArray(properties.tags) ? properties.tags : [];
                    resolve(properties);
                } catch (e) {
                    reject(new Error('Failed to parse properties: ' + e.message));
                }
            } else {
                reject(new Error(error || 'Failed to get file properties'));
            }
        });

        ps.on('error', (err) => {
            reject(new Error('Failed to start PowerShell: ' + err.message));
        });
    });
}

async function processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    const allProperties = [];

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
            try {
                const properties = await getFileProperties(filePath);
                console.log('File Properties:', properties.filename);
                allProperties.push(properties);
            } catch (error) {
                console.error('Error processing', file, ':', error.message);
            }
        }
    }

    return allProperties;
}

function customStringify(obj, space) {
    return JSON.stringify(obj, null, space).replace(
        /\[\n\s+(?=")(.+?)\n\s+\]/gs,
        (match, content) => `[${content.split(',\n').map(s => s.trim()).join(',')}]`
    );
}

async function main() {
    const srcPath = path.resolve(__dirname, 'src');
    
    try {
        const allProperties = await processDirectory(srcPath);
        fs.writeFileSync('exif.json', customStringify(allProperties, 4));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
